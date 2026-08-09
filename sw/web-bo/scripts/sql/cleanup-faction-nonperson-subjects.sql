do $$
begin
  raise exception using message =
    'RETIRED: non-person cleanup targeted the removed mixed profile domain and must not be executed.';
end
$$;
