from supabase import create_client, Client
from functools import lru_cache
from shared.config import get_settings


@lru_cache()
def get_db() -> Client:
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


def get_table(schema: str, table: str):
    """
    Returns a query builder for a table in a custom schema.
    Works with all supabase-py versions by passing the schema
    header directly through the postgrest client.
    """
    client = get_db()
    # This sets the db schema for the PostgREST client
    client.postgrest.schema(schema)
    return client.table(table)