import { Category } from '@/types/menu';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryTabs({ categories, activeCategory, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
          activeCategory === null
            ? 'bg-primary text-primary-foreground shadow-medium'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        )}
      >
        Todos
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200',
            activeCategory === category.id
              ? 'bg-primary text-primary-foreground shadow-medium'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
