#!/usr/bin/env python3
"""
Importa colaboradores a partir do PDF de contatos.

Regras:
- Atualiza ou cria por telefone_login (quando válido).
- Sem telefone válido, tenta atualizar por (nome + unidade); senão cria.
- Preserva usuários com role admin/socio já existentes.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import pypdf
import requests


EMAIL_RE = re.compile(r"([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})")
DIGITS_RE = re.compile(r"\D+")


def parse_env_file(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    if not path.exists():
        return data
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip()
    return data


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_telefone_login(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = DIGITS_RE.sub("", raw)
    if len(digits) in (12, 13) and digits.startswith("55"):
        digits = digits[2:]
    if len(digits) not in (10, 11):
        return None
    return digits


def detect_loja(text: str) -> tuple[str, str, str]:
    patterns = [
        ("Nova Iguaçu", "Nova Iguaçu", "nova-iguacu"),
        ("Nova Igua", "Nova Iguaçu", "nova-iguacu"),
        ("Quiosque", "Barra", "barra"),
        ("Matriz", "Matriz", "matriz"),
        ("Barra", "Barra", "barra"),
    ]
    for needle, label, slug in patterns:
        idx = text.find(needle)
        if idx >= 0:
            left = normalize_whitespace(text[:idx])
            right = normalize_whitespace(text[idx + len(needle) :])
            return left, right, slug
    return "", normalize_whitespace(text), "matriz"


def parse_pdf_rows(pdf_path: Path) -> list[dict[str, Any]]:
    reader = pypdf.PdfReader(str(pdf_path))
    text = "\n".join((pg.extract_text() or "") for pg in reader.pages)
    lines = [normalize_whitespace(ln) for ln in text.splitlines() if normalize_whitespace(ln)]
    rows: list[dict[str, Any]] = []

    for line in lines:
        lower = line.lower()
        if lower.startswith("registro de funcion") or lower.startswith("fun") or line.startswith("--"):
            continue

        email_match = EMAIL_RE.search(line)
        email = email_match.group(1).strip() if email_match else None
        if email_match:
            before = normalize_whitespace(line[: email_match.start()])
            tail = normalize_whitespace(line[email_match.end() :])
        else:
            before = line
            tail = ""

        phone_digits_all = DIGITS_RE.sub("", tail)
        telefone = phone_digits_all if phone_digits_all else None
        cargo, nome, unidade_slug = detect_loja(before)
        nome = nome.strip(" -")
        cargo = cargo.strip(" -")
        telefone_login = normalize_telefone_login(telefone)

        if not nome:
            continue

        rows.append(
            {
                "nome": nome,
                "email": email,
                "telefone": telefone,
                "telefone_login": telefone_login,
                "cargo": cargo or None,
                "unidade_slug": unidade_slug,
                "role": "colaborador",
                "onboarding_completo": False,
                "cpf": None,
            }
        )
    return rows


class SupabaseRest:
    def __init__(self, url: str, service_key: str) -> None:
        self.base = url.rstrip("/") + "/rest/v1"
        self.session = requests.Session()
        self.session.headers.update(
            {
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
            }
        )

    def get(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        res = self.session.get(f"{self.base}/{table}", params=params, timeout=30)
        res.raise_for_status()
        return res.json()

    def insert_one(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        headers = {"Prefer": "return=representation"}
        res = self.session.post(f"{self.base}/{table}", data=json.dumps([payload]), headers=headers, timeout=30)
        res.raise_for_status()
        data = res.json()
        return data[0] if data else {}

    def patch(self, table: str, match: dict[str, str], payload: dict[str, Any]) -> int:
        params = match.copy()
        params["select"] = "id"
        headers = {"Prefer": "return=representation"}
        res = self.session.patch(
            f"{self.base}/{table}", params=params, data=json.dumps(payload), headers=headers, timeout=30
        )
        res.raise_for_status()
        return len(res.json())

    def column_exists(self, table: str, column: str) -> bool:
        res = self.session.get(
            f"{self.base}/{table}",
            params={"select": column, "limit": "1"},
            timeout=30,
        )
        if res.status_code == 400 and "does not exist" in res.text.lower():
            return False
        res.raise_for_status()
        return True


def ensure_unidades(api: SupabaseRest) -> dict[str, str]:
    default_units = [
        {"nome": "Matriz", "slug": "matriz"},
        {"nome": "Barra", "slug": "barra"},
        {"nome": "Nova Iguaçu", "slug": "nova-iguacu"},
        {"nome": "Quiosque", "slug": "quiosque"},
    ]
    unidade_by_slug: dict[str, str] = {}
    existing = api.get("unidades", {"select": "id,slug,nome"})
    for u in existing:
        slug = str(u.get("slug") or "").strip()
        uid = str(u.get("id") or "").strip()
        if slug and uid:
            unidade_by_slug[slug] = uid
    for u in default_units:
        if u["slug"] in unidade_by_slug:
            continue
        created = api.insert_one("unidades", u)
        unidade_by_slug[u["slug"]] = str(created["id"])
    return unidade_by_slug


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True, help="Caminho do PDF de contatos.")
    parser.add_argument(
        "--env-file",
        default=".env.local",
        help="Arquivo de env com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    )
    args = parser.parse_args()

    env = parse_env_file(Path(args.env_file))
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL", "")
    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_key:
        raise SystemExit("Variáveis NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não encontradas no env.")

    rows = parse_pdf_rows(Path(args.pdf))
    if not rows:
        raise SystemExit("Nenhum colaborador foi lido do PDF.")

    api = SupabaseRest(supabase_url, service_key)
    unidade_by_slug = ensure_unidades(api)
    has_telefone_login = api.column_exists("colaboradores", "telefone_login")
    has_cpf = api.column_exists("colaboradores", "cpf")

    created = 0
    updated = 0
    no_phone = 0
    errors: list[str] = []

    for row in rows:
        slug = str(row["unidade_slug"])
        unidade_id = unidade_by_slug.get(slug) or unidade_by_slug.get("matriz")
        payload = {
            "nome": row["nome"],
            "email": row["email"],
            "telefone": row["telefone"],
            "cargo": row["cargo"],
            "unidade_id": unidade_id,
            "role": row["role"],
        }
        if has_telefone_login:
            payload["telefone_login"] = row["telefone_login"]

        try:
            if has_telefone_login and row["telefone_login"]:
                changed = api.patch(
                    "colaboradores", {"telefone_login": f"eq.{row['telefone_login']}"}, payload
                )
                if changed > 0:
                    updated += 1
                else:
                    payload["onboarding_completo"] = row["onboarding_completo"]
                    if has_cpf:
                        payload["cpf"] = row["cpf"]
                    try:
                        api.insert_one("colaboradores", payload)
                    except Exception as exc:
                        msg = str(exc).lower()
                        if has_cpf and ("null value in column \"cpf\"" in msg or "not-null" in msg):
                            fallback_cpf = ("9" + (row["telefone_login"] or f"{created+updated+1:010d}")[-10:])[:11]
                            payload["cpf"] = fallback_cpf
                            api.insert_one("colaboradores", payload)
                        else:
                            raise
                    created += 1
            else:
                no_phone += 1
                changed = api.patch(
                    "colaboradores",
                    {"nome": f"eq.{row['nome']}", "unidade_id": f"eq.{unidade_id}"},
                    payload,
                )
                if changed > 0:
                    updated += 1
                else:
                    payload["onboarding_completo"] = row["onboarding_completo"]
                    if has_cpf:
                        payload["cpf"] = row["cpf"]
                    try:
                        api.insert_one("colaboradores", payload)
                    except Exception as exc:
                        msg = str(exc).lower()
                        if has_cpf and ("null value in column \"cpf\"" in msg or "not-null" in msg):
                            fallback_cpf = "900000" + f"{created+updated+1:05d}"
                            payload["cpf"] = fallback_cpf
                            api.insert_one("colaboradores", payload)
                        else:
                            raise
                    created += 1
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{row['nome']}: {exc}")

    select_fields = "id,nome,role"
    if has_telefone_login:
        select_fields += ",telefone_login"
    if has_cpf:
        select_fields += ",cpf"
    all_cols = api.get("colaboradores", {"select": select_fields})
    total = len(all_cols)
    privileged = [c for c in all_cols if str(c.get("role") or "").lower() in {"admin", "socio"}]

    print(
        json.dumps(
            {
                "lidos_pdf": len(rows),
                "criados": created,
                "atualizados": updated,
                "sem_telefone_login_valido": no_phone,
                "erros": errors[:10],
                "total_colaboradores": total,
                "total_admin_ou_socio": len(privileged),
                "schema": {
                    "has_telefone_login": has_telefone_login,
                    "has_cpf": has_cpf,
                },
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
