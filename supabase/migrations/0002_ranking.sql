-- Ranking signals for the feed algorithm (fng.txt §2).
alter table forms add column if not exists starts_in_h int not null default 99;
