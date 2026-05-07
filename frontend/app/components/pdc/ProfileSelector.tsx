'use client';

import { usePDCStore } from '@/app/store/pdcStore';

const PROFILES = [
  {
    id: 'dyslexia',
    name: 'Dyslexia',
    nameSp: 'Dislexia',
    color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300',
    selectedColor: 'bg-purple-500 text-white',
    description: 'Font preferences, visual structure, short sentences',
  },
  {
    id: 'adhd',
    name: 'ADHD',
    nameSp: 'TDAH',
    color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300',
    selectedColor: 'bg-orange-500 text-white',
    description: 'Short segments, engagement, checkpoints',
  },
  {
    id: 'autism',
    name: 'Autism',
    nameSp: 'Autismo',
    color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300',
    selectedColor: 'bg-blue-500 text-white',
    description: 'Clear structure, explicit language, predictability',
  },
  {
    id: 'dyscalculia',
    name: 'Dyscalculia',
    nameSp: 'Discalculia',
    color: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300',
    selectedColor: 'bg-green-500 text-white',
    description: 'Concrete examples, manipulatives, estimation',
  },
];

export default function ProfileSelector() {
  const { selectedProfiles, setSelectedProfiles } = usePDCStore();

  const toggleProfile = (profileId: string) => {
    const newProfiles = selectedProfiles.includes(profileId)
      ? selectedProfiles.filter((p) => p !== profileId)
      : [...selectedProfiles, profileId];
    setSelectedProfiles(newProfiles);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PROFILES.map((profile) => {
        const isSelected = selectedProfiles.includes(profile.id);

        return (
          <button
            key={profile.id}
            onClick={() => toggleProfile(profile.id)}
            title={profile.description}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-all border-2 ${
              isSelected
                ? profile.selectedColor + ' border-current'
                : profile.color
            }`}
          >
            {profile.nameSp}
          </button>
        );
      })}
    </div>
  );
}
