-- Directions link: hosts paste a map link when creating; detail shows Directions.
alter table forms add column if not exists map_link text;
