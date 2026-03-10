import { Category } from '@/types/menu';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryTabs({ categories, activeCategory, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {['all', ...categories.map(c => c.id)].map((id, i) => {
        const isAll = id === 'all';
        const label = isAll ? 'Todo' : categories[i - 1]?.name;
        const isActive = isAll ? activeCategory === null : activeCategory === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(isAll ? null : id)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border',
              isActive
                ? 'border-[#c9a84c] text-[#c9a84c] bg-[#c9a84c]/10'
                : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white/70 bg-transparent'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}