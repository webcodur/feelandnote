begin;

do $$
declare
  item record;
begin
  for item in
    select *
    from (values
      ('celeb_content_research_runs', 'celeb_id', 'ccrr_celeb_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_music_candidates', 'celeb_id', 'cmc_celeb_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_dialogues', 'celeb_id', 'celeb_dialogues_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_influence', 'celeb_id', 'celeb_influence_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_persona', 'celeb_id', 'celeb_persona_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_relations', 'from_id', 'celeb_relations_from_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_relations', 'to_id', 'celeb_relations_to_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_relations_external', 'from_id', 'celeb_rel_external_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_tag_assignments', 'celeb_id', 'celeb_tags_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_task_queue', 'celeb_id', 'celeb_task_queue_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_timeline_events', 'celeb_id', 'celeb_timeline_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_views_daily', 'celeb_id', 'celeb_views_celebs_fkey', 'celebs', 'cascade'),
      ('daily_figures', 'celeb_id', 'daily_figures_celebs_fkey', 'celebs', 'cascade'),
      ('discourse_speakers', 'celeb_id', 'discourse_speakers_celebs_fkey', 'celebs', 'restrict'),
      ('faction_people', 'celeb_id', 'faction_people_celebs_fkey', 'celebs', 'restrict'),
      ('fiction_source_characters', 'celeb_id', 'fiction_characters_celebs_fkey', 'celebs', 'cascade'),
      ('celeb_explanations', 'profile_id', 'celeb_explanations_celebs_fkey', 'celebs', 'cascade'),

      ('academy_lesson_progress', 'user_id', 'academy_progress_accounts_fkey', 'user_accounts', 'cascade'),
      ('activity_logs', 'user_id', 'activity_logs_accounts_fkey', 'user_accounts', 'cascade'),
      ('blind_game_scores', 'user_id', 'blind_scores_accounts_fkey', 'user_accounts', 'cascade'),
      ('board_comments', 'author_id', 'board_comments_accounts_fkey', 'user_accounts', 'cascade'),
      ('content_recommendations', 'receiver_id', 'recommendations_receiver_accounts_fkey', 'user_accounts', 'cascade'),
      ('content_recommendations', 'sender_id', 'recommendations_sender_accounts_fkey', 'user_accounts', 'cascade'),
      ('feedbacks', 'author_id', 'feedbacks_author_accounts_fkey', 'user_accounts', 'cascade'),
      ('feedbacks', 'resolved_by', 'feedbacks_resolver_accounts_fkey', 'user_accounts', 'set null'),
      ('flow_progress', 'user_id', 'flow_progress_accounts_fkey', 'user_accounts', 'cascade'),
      ('flows', 'user_id', 'flows_accounts_fkey', 'user_accounts', 'cascade'),
      ('free_post_comments', 'author_id', 'free_comments_accounts_fkey', 'user_accounts', 'set null'),
      ('free_posts', 'author_id', 'free_posts_accounts_fkey', 'user_accounts', 'set null'),
      ('notes', 'user_id', 'notes_accounts_fkey', 'user_accounts', 'cascade'),
      ('notices', 'author_id', 'notices_author_accounts_fkey', 'user_accounts', 'cascade'),
      ('record_comments', 'user_id', 'record_comments_accounts_fkey', 'user_accounts', 'cascade'),
      ('record_likes', 'user_id', 'record_likes_accounts_fkey', 'user_accounts', 'cascade'),
      ('records', 'contributor_id', 'records_contributor_accounts_fkey', 'user_accounts', 'no action'),
      ('records', 'user_id', 'records_user_accounts_fkey', 'user_accounts', 'cascade'),
      ('reports', 'reporter_id', 'reports_reporter_accounts_fkey', 'user_accounts', 'cascade'),
      ('reports', 'resolved_by', 'reports_resolver_accounts_fkey', 'user_accounts', 'no action'),
      ('reports', 'target_user_id', 'reports_target_accounts_fkey', 'user_accounts', 'set null'),
      ('tier_lists', 'user_id', 'tier_lists_accounts_fkey', 'user_accounts', 'cascade'),
      ('blocks', 'blocker_id', 'blocks_blocker_accounts_fkey', 'user_accounts', 'cascade'),
      ('blocks', 'blocked_id', 'blocks_blocked_accounts_fkey', 'user_accounts', 'cascade'),
      ('follows', 'follower_id', 'follows_follower_accounts_fkey', 'user_accounts', 'cascade'),
      ('guestbook_entries', 'author_id', 'guestbook_author_accounts_fkey', 'user_accounts', 'cascade'),
      ('user_contents', 'contributor_id', 'user_contents_contributor_accounts_fkey', 'user_accounts', 'no action'),
      ('celeb_content_research_runs', 'researcher_id', 'ccrr_researcher_accounts_fkey', 'user_accounts', 'set null'),
      ('saved_flows', 'user_id', 'saved_flows_accounts_fkey', 'user_accounts', 'cascade'),
      ('profiles', 'claimed_by', 'profiles_claimed_by_accounts_fkey', 'user_accounts', 'set null')
    ) as constraints_to_add(
      table_name,
      column_name,
      constraint_name,
      parent_table,
      delete_action
    )
  loop
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete %s not valid',
      item.table_name,
      item.constraint_name,
      item.column_name,
      item.parent_table,
      item.delete_action
    );
  end loop;

  for item in
    select *
    from (values
      ('celeb_content_research_runs', 'ccrr_celeb_celebs_fkey'),
      ('celeb_music_candidates', 'cmc_celeb_celebs_fkey'),
      ('celeb_dialogues', 'celeb_dialogues_celebs_fkey'),
      ('celeb_influence', 'celeb_influence_celebs_fkey'),
      ('celeb_persona', 'celeb_persona_celebs_fkey'),
      ('celeb_relations', 'celeb_relations_from_celebs_fkey'),
      ('celeb_relations', 'celeb_relations_to_celebs_fkey'),
      ('celeb_relations_external', 'celeb_rel_external_celebs_fkey'),
      ('celeb_tag_assignments', 'celeb_tags_celebs_fkey'),
      ('celeb_task_queue', 'celeb_task_queue_celebs_fkey'),
      ('celeb_timeline_events', 'celeb_timeline_celebs_fkey'),
      ('celeb_views_daily', 'celeb_views_celebs_fkey'),
      ('daily_figures', 'daily_figures_celebs_fkey'),
      ('discourse_speakers', 'discourse_speakers_celebs_fkey'),
      ('faction_people', 'faction_people_celebs_fkey'),
      ('fiction_source_characters', 'fiction_characters_celebs_fkey'),
      ('celeb_explanations', 'celeb_explanations_celebs_fkey'),
      ('academy_lesson_progress', 'academy_progress_accounts_fkey'),
      ('activity_logs', 'activity_logs_accounts_fkey'),
      ('blind_game_scores', 'blind_scores_accounts_fkey'),
      ('board_comments', 'board_comments_accounts_fkey'),
      ('content_recommendations', 'recommendations_receiver_accounts_fkey'),
      ('content_recommendations', 'recommendations_sender_accounts_fkey'),
      ('feedbacks', 'feedbacks_author_accounts_fkey'),
      ('feedbacks', 'feedbacks_resolver_accounts_fkey'),
      ('flow_progress', 'flow_progress_accounts_fkey'),
      ('flows', 'flows_accounts_fkey'),
      ('free_post_comments', 'free_comments_accounts_fkey'),
      ('free_posts', 'free_posts_accounts_fkey'),
      ('notes', 'notes_accounts_fkey'),
      ('notices', 'notices_author_accounts_fkey'),
      ('record_comments', 'record_comments_accounts_fkey'),
      ('record_likes', 'record_likes_accounts_fkey'),
      ('records', 'records_contributor_accounts_fkey'),
      ('records', 'records_user_accounts_fkey'),
      ('reports', 'reports_reporter_accounts_fkey'),
      ('reports', 'reports_resolver_accounts_fkey'),
      ('reports', 'reports_target_accounts_fkey'),
      ('tier_lists', 'tier_lists_accounts_fkey'),
      ('blocks', 'blocks_blocker_accounts_fkey'),
      ('blocks', 'blocks_blocked_accounts_fkey'),
      ('follows', 'follows_follower_accounts_fkey'),
      ('guestbook_entries', 'guestbook_author_accounts_fkey'),
      ('user_contents', 'user_contents_contributor_accounts_fkey'),
      ('celeb_content_research_runs', 'ccrr_researcher_accounts_fkey'),
      ('saved_flows', 'saved_flows_accounts_fkey'),
      ('profiles', 'profiles_claimed_by_accounts_fkey')
    ) as constraints_to_validate(table_name, constraint_name)
  loop
    execute format(
      'alter table public.%I validate constraint %I',
      item.table_name,
      item.constraint_name
    );
  end loop;
end;
$$;

do $$
declare
  expected_count integer := 47;
  actual_count integer;
begin
  select count(*)
  into actual_count
  from pg_catalog.pg_constraint as constraint_record
  where constraint_record.contype = 'f'
    and constraint_record.convalidated
    and constraint_record.conname = any (array[
      'ccrr_celeb_celebs_fkey',
      'cmc_celeb_celebs_fkey',
      'celeb_dialogues_celebs_fkey',
      'celeb_influence_celebs_fkey',
      'celeb_persona_celebs_fkey',
      'celeb_relations_from_celebs_fkey',
      'celeb_relations_to_celebs_fkey',
      'celeb_rel_external_celebs_fkey',
      'celeb_tags_celebs_fkey',
      'celeb_task_queue_celebs_fkey',
      'celeb_timeline_celebs_fkey',
      'celeb_views_celebs_fkey',
      'daily_figures_celebs_fkey',
      'discourse_speakers_celebs_fkey',
      'faction_people_celebs_fkey',
      'fiction_characters_celebs_fkey',
      'celeb_explanations_celebs_fkey',
      'academy_progress_accounts_fkey',
      'activity_logs_accounts_fkey',
      'blind_scores_accounts_fkey',
      'board_comments_accounts_fkey',
      'recommendations_receiver_accounts_fkey',
      'recommendations_sender_accounts_fkey',
      'feedbacks_author_accounts_fkey',
      'feedbacks_resolver_accounts_fkey',
      'flow_progress_accounts_fkey',
      'flows_accounts_fkey',
      'free_comments_accounts_fkey',
      'free_posts_accounts_fkey',
      'notes_accounts_fkey',
      'notices_author_accounts_fkey',
      'record_comments_accounts_fkey',
      'record_likes_accounts_fkey',
      'records_contributor_accounts_fkey',
      'records_user_accounts_fkey',
      'reports_reporter_accounts_fkey',
      'reports_resolver_accounts_fkey',
      'reports_target_accounts_fkey',
      'tier_lists_accounts_fkey',
      'blocks_blocker_accounts_fkey',
      'blocks_blocked_accounts_fkey',
      'follows_follower_accounts_fkey',
      'guestbook_author_accounts_fkey',
      'user_contents_contributor_accounts_fkey',
      'ccrr_researcher_accounts_fkey',
      'saved_flows_accounts_fkey',
      'profiles_claimed_by_accounts_fkey'
    ]::name[]);

  if actual_count <> expected_count then
    raise exception 'domain foreign key count mismatch: expected %, got %',
      expected_count,
      actual_count;
  end if;
end;
$$;

commit;
