import { MediaCard } from "./MediaCard";

export function MediaGrid({ mediaList, onMediaClick }) {
  if (mediaList.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-zinc-500 text-lg">Aucun média ne correspond à vos critères.</p>
      </div>
    );
  }

  const grouped = mediaList.reduce((acc, media) => {
    const type = media.type || "Autre";
    if (!acc[type]) acc[type] = [];
    acc[type].push(media);
    return acc;
  }, {});

  const order = ["Film", "Série", "Animé", "Manga"];
  const sortedTypes = Object.keys(grouped).sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-20 md:py-6 md:pb-24 space-y-12">
      {sortedTypes.map(type => (
        <section key={type} className="animate-in fade-in duration-500">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-zinc-100">{type}{type !== 'Autre' && 's'}</h2>
            <span className="px-2.5 py-0.5 bg-zinc-800/80 border border-zinc-700/50 text-zinc-300 text-xs rounded-full font-semibold">
              {grouped[type].length}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {grouped[type].map((media) => (
              <MediaCard key={media.id} media={media} onClick={() => onMediaClick(media)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
