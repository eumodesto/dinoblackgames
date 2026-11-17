-- Função proxy para executar SQL via REST API (PostgREST).
-- Necessária enquanto o connection pooler do Supabase não propaga o tenant,
-- pois o endpoint direto (db.*) é IPv6-only e Vercel Lambda não suporta IPv6.
-- Acesso restrito a service_role (nunca exposta a anon/authenticated).

CREATE OR REPLACE FUNCTION public.exec_sql(
  sql_text text,
  params jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  modified text := sql_text;
  i int;
  v text;
  is_query boolean;
BEGIN
  FOR i IN REVERSE jsonb_array_length(params)-1..0 LOOP
    v := params->>i;
    IF v IS NULL THEN
      modified := replace(modified, '$' || (i + 1), 'NULL');
    ELSE
      modified := replace(modified, '$' || (i + 1), quote_literal(v));
    END IF;
  END LOOP;

  is_query := lower(trim(modified)) ~ '^(\(|select|with)\s*';

  IF is_query THEN
    EXECUTE format(
      'SELECT coalesce(jsonb_agg(row_to_json(r)), ''[]''::jsonb) FROM (%s) r',
      modified
    ) INTO result;
  ELSE
    EXECUTE modified;
    result := '[]'::jsonb;
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role;
REVOKE EXECUTE ON FUNCTION public.exec_sql FROM anon, authenticated;
