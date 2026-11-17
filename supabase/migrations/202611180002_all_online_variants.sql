-- Keep room variants aligned with the authoritative native rules and public catalog.
alter table public.rooms drop constraint if exists rooms_variant_check;
alter table public.rooms add constraint rooms_variant_check check (variant in ('chess','dropping','chaos','random','blind','blindtext','crazyhouse','duck','atomic','cvfog','3check','kingofthehill','horde','antichess','cvpawns','cvpawnrace','chess960','bughouse','speedrun'));
