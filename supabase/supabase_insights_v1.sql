-- Function to get failure tag counts by day of week
create or replace function get_insights_failure_by_day(p_user_id uuid) returns table (
        day_label text,
        failure_tag text,
        occurrence_count bigint
    ) language sql security definer as $$
select trim(to_char(scheduled_date, 'Day')) as day_label,
    failure_tag,
    count(*) as occurrence_count
from daily_tasks t
    join agendas a on t.agenda_id = a.id
where a.user_id = p_user_id
    and t.failure_tag is not null
    and t.failure_tag != 'NONE'
group by 1,
    2
order by occurrence_count desc;
$$;