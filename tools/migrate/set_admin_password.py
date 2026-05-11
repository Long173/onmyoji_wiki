#!/usr/bin/env python3
"""Set (or reset) an admin user's password directly via service_role.

Useful when:
  - Email confirmation links keep getting pre-clicked by corporate scanners
  - You just want password-based login for the admin portal
  - You forgot the password and don't want to wait for a reset email

Run from `tools/migrate/`:
    source .venv/bin/activate
    python set_admin_password.py long.nh@newera.inc mySecretPassword

If the user doesn't exist yet, it is created and auto-confirmed.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


def main() -> int:
    if len(sys.argv) != 3:
        print(f"usage: {sys.argv[0]} <email> <password>", file=sys.stderr)
        return 2

    email, password = sys.argv[1].strip(), sys.argv[2]

    load_dotenv(Path(__file__).parent / ".env")
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        print(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in "
            "tools/migrate/.env",
            file=sys.stderr,
        )
        return 1

    client = create_client(url, key)

    # Find existing user by email.
    page = client.auth.admin.list_users()
    users = getattr(page, "users", None) or page  # SDK shape varies
    existing = next(
        (u for u in users if (getattr(u, "email", None) or "").lower() == email.lower()),
        None,
    )

    if existing is None:
        client.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,  # bypass the confirm-signup email
            }
        )
        print(f"✓ Created user {email} with password (confirmed).")
    else:
        client.auth.admin.update_user_by_id(existing.id, {"password": password})
        print(f"✓ Updated password for existing user {email}.")

    print(
        "\nLogin: http://localhost:3000/login (or your Vercel URL)\n"
        "  Email:    " + email + "\n"
        "  Password: " + ("*" * len(password))
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
