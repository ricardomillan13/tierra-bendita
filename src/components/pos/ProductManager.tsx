import { useState } from 'react';
import { Plus, Edit2, Trash2, Coffee } from 'lucide-react';
import { Product } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  useAllProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/useProducts';
import {
  useAllCategories,
  useCreateCategory,
} from '@/hooks/useCategories';

import { useToast } from '@/hooks/use-toast';
import { ImageUploader } from './ImageUploader';

export function ProductManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data: products = [] } = useAllProducts();
  const { data: categories = [] } = useAllCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createCategory = useCreateCategory();
  const { toast } = useToast();

  // modal crear categoría
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_available: true,
    display_order: 0,
    image_url: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      is_available: true,
      display_order: 0,
      image_url: '',
    });
    setEditingProduct(null);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category_id: product.category_id || '',
      is_available: product.is_available,
      display_order: product.display_order,
      image_url: product.image_url || '',
    });
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.price) {
      toast({
        title: 'Error',
        description: 'Nombre y precio son requeridos',
        variant: 'destructive',
      });
      return;
    }

    const productData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: parseFloat(formData.price),
      category_id: formData.category_id || null,
      is_available: formData.is_available,
      display_order: formData.display_order,
      image_url: formData.image_url || null,
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
        toast({ title: 'Producto actualizado' });
      } else {
        await createProduct.mutateAsync(productData);
        toast({ title: 'Producto creado' });
      }
      setIsOpen(false);
      resetForm();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el producto',
        variant: 'destructive',
      });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const created = await createCategory.mutateAsync({
        name: newCategoryName.trim(),
      });

      setFormData((prev) => ({
        ...prev,
        category_id: created.id,
      }));

      setNewCategoryName('');
      setIsCategoryModalOpen(false);
      toast({ title: 'Categoría creada' });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo crear la categoría',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: 'Producto eliminado' });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el producto',
        variant: 'destructive',
      });
    }
  };

  const getCategoryName = (categoryId: string | null) =>
    categories.find((c) => c.id === categoryId)?.name || 'Sin categoría';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Productos</h2>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Imagen del producto</Label>
                <ImageUploader
                  currentImage={formData.image_url || null}
                  onImageChange={(url) =>
                    setFormData({ ...formData, image_url: url || '' })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category_id: value })
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setIsCategoryModalOpen(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Disponible</Label>
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_available: checked })
                  }
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSubmit}>
                  {editingProduct ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* LISTA */}
      <div className="space-y-2">
        {products.map((product) => (
          <div key={product.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} className="w-full h-full object-cover" />
              ) : (
                <Coffee className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                ${product.price.toFixed(2)} • {getCategoryName(product.category_id)}
              </p>
            </div>

            <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* MODAL CREAR CATEGORÍA */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Nombre de la categoría"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateCategory}>Crear</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
