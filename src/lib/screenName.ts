export function isGeneratedUsername(name?:string|null){return /^player_/i.test(name?.trim()||'');}
/** Prefer chosen public names and keep generated account handles out of labels. */
export function screenName(profile?:{screen_name?:string|null;username?:string|null;name?:string|null}|null,fallback='Player'){
 for(const value of [profile?.screen_name,profile?.name,profile?.username]){
  const name=value?.trim();if(name && !isGeneratedUsername(name))return name;
 }
 return fallback;
}
