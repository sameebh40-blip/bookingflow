-- Notify the recipient whenever a message is sent (both directions), so chat
-- works end-to-end with notifications regardless of which client build runs.
--   client -> venue : notify the shop owner
--   venue  -> client: notify the client
-- realtime on messages/notifications is already enabled (migration 0012).

create or replace function public.on_message_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_shop_name text;
begin
  begin
    if NEW.is_from_venue is true then
      -- venue replied → notify the customer
      if NEW.client_id is not null then
        select name into v_shop_name from public.barbershops where id = NEW.venue_id;
        insert into public.notifications (profile_id, type, title, body, data)
        values (NEW.client_id, 'message', coalesce(v_shop_name, 'New message'),
                left(coalesce(NEW.text, ''), 140),
                jsonb_build_object('venue_id', NEW.venue_id, 'message_id', NEW.id));
      end if;
    else
      -- customer messaged the shop → notify the owner
      select owner_profile_id into v_owner from public.barbershops where id = NEW.venue_id;
      if v_owner is not null and v_owner <> coalesce(NEW.sender_id, '00000000-0000-0000-0000-000000000000'::uuid) then
        insert into public.notifications (profile_id, type, title, body, data)
        values (v_owner, 'message', 'New message',
                left(coalesce(NEW.text, ''), 140),
                jsonb_build_object('venue_id', NEW.venue_id, 'client_id', NEW.client_id, 'message_id', NEW.id));
      end if;
    end if;
  exception when others then null;
  end;
  return NEW;
end;
$$;

drop trigger if exists trg_on_message_created on public.messages;
create trigger trg_on_message_created
  after insert on public.messages
  for each row execute function public.on_message_created();
