import { useState } from 'react';
import { Plus, Edit2, Trash2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  useAllCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Category = Tables<'categories'>;

export function CategoryManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');

  const { data: categories = [] } = useAllCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { toast } = useToast();

  const reset = () => {
    setName('');
    setEditing(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'El nombre es requerido', variant: 'destructive' });
      return;
    }

    try {
      if (editing) {
        await updateCategory.mutateAsync({
          id: editing.id,
          name,
        });
        toast({ title: 'Categoría actualizada' });
      } else {
        await createCategory.mutateAsync({
          name,
        });
        toast({ title: 'Categoría creada' });
      }

      setIsOpen(false);
      reset();
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;

    try {
      await deleteCategory.mutateAsync(id);
      toast({ title: 'Categoría eliminada' });
    } catch {
      toast({ title: 'No se pudo eliminar', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl font-bold">Categorías</h2>

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nueva
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Editar categoría' : 'Nueva categoría'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSave}>
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {categories.map((cat) => (
        <div
          key={cat.id}
          className="flex items-center gap-3 p-3 border rounded-lg"
        >
          <Folder className="w-5 h-5 text-muted-foreground" />
          <p className="flex-1 font-medium">{cat.name}</p>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setEditing(cat);
              setName(cat.name);
              setIsOpen(true);
            }}
          >
            <Edit2 className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDelete(cat.id)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
