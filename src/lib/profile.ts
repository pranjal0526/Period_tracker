type BasicProfile = {
  nickname?: string | null;
  name?: string | null;
};

export function getDisplayName(profile?: BasicProfile | null) {
  if (!profile) {
    return "Ember user";
  }

  return profile.nickname?.trim() || profile.name?.trim() || "Ember user";
}
