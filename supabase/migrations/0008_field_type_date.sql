-- =======================================================================
-- 0008_field_type_date.sql — Novo tipo de campo "date" (data pura)
-- =======================================================================
-- Adiciona o valor 'date' ao enum form_field_type. Diferente de
-- 'meeting_slot' (datetime-local, p/ agendar call), 'date' é um seletor
-- de data simples (dia/mês/ano), sem horário. Útil pra data de nascimento,
-- data do evento, prazo etc. O valor é salvo como string ISO 'YYYY-MM-DD'.
--
-- ALTER TYPE ... ADD VALUE não pode rodar dentro de um bloco transacional
-- junto de usos do novo valor, mas como aqui só adicionamos o rótulo do
-- enum, IF NOT EXISTS garante idempotência em re-execuções.
-- =======================================================================

alter type form_field_type add value if not exists 'date';
