-- exec_sql devolvia [] para INSERT/UPDATE/DELETE ... RETURNING (só SELECT/WITH retornavam linhas).
-- No caminho REST do app (usado quando a conexão direta ao Postgres não está disponível), isso quebrava
-- qualquer rota que lê o id recém-criado: o INSERT era gravado, mas o app recebia [] e falhava no meio
-- (ex.: produto criado sem variante). Agora instruções INSERT/UPDATE/DELETE com RETURNING devolvem as linhas.
-- Continua restrita a service_role.

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
  is_dml_returning boolean;
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
  is_dml_returning := lower(trim(modified)) ~ '^(insert|update|delete)\M' AND lower(modified) ~ '\mreturning\M';

  IF is_query THEN
    EXECUTE format(
      'SELECT coalesce(jsonb_agg(row_to_json(r)), ''[]''::jsonb) FROM (%s) r',
      modified
    ) INTO result;
  ELSIF is_dml_returning THEN
    -- Instruções que modificam dados só podem ficar em CTE no topo, não em subconsulta.
    EXECUTE format(
      'WITH r AS (%s) SELECT coalesce(jsonb_agg(row_to_json(r)), ''[]''::jsonb) FROM r',
      rtrim(trim(modified), E' \n\r\t;')
    ) INTO result;
  ELSE
    EXECUTE modified;
    result := '[]'::jsonb;
  END IF;

  RETURN result;
END;
$$;

-- Só service_role executa (PUBLIC também precisa ser revogado; ver migration 8).
REVOKE EXECUTE ON FUNCTION public.exec_sql(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text, jsonb) TO service_role;
