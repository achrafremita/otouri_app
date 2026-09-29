alter table licenses add column if not exists phone text;
alter table licenses alter column machine_id drop not null;
create index if not exists licenses_phone_idx on licenses (phone);
create unique index if not exists licenses_checkout_id_key on licenses (checkout_id) where checkout_id is not null;
