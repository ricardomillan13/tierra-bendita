import { useState } from 'react';
import { Plus, Edit2, Trash2, Coffee, Monitor, Tag, Clock } from 'lucide-react';
import { Product, Promotion } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  useAllProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useAllPromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion,
} from '@/hooks/useProducts';
import { useAllCategories, useCreateCategory } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';
import { ImageUploader } from './ImageUploader';
import { formatSchedule } from '@/lib/schedule';

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const defaultProductForm = {
  name: '', description: '', price: '', category_id: '',
  is_available: true, show_in_display: true, is_featured: false, is_cross_sell: false, display_order: 0, image_url: '',
  use_schedule: false,
  available_days: [] as number[],
  available_from: '08:00',
  available_to: '22:00',
  has_sizes: false,
  price_large: '',
};

const defaultPromoForm = {
  title: '', description: '',
  discount_type: 'price' as Promotion['discount_type'],
  discount_value: '', badge_text: '', image_url: '', is_active: true, display_order: 0,
};

export function ProductManager() {
  // ── Product state ──
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState(defaultProductForm);

  // ── Category modal state ──
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // ── Promotion state ──
  const [promoOpen, setPromoOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoForm, setPromoForm] = useState(defaultPromoForm);

  // ── Data ──
  const { data: products = [] } = useAllProducts();
  const { data: categories = [] } = useAllCategories();
  const { data: promotions = [] } = useAllPromotions();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createCategory = useCreateCategory();
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const deletePromotion = useDeletePromotion();
  const { toast } = useToast();

  // ── Product helpers ──
  const resetProductForm = () => { setProductForm(defaultProductForm); setEditingProduct(null); };

  const toggleDay = (day: number) => {
    setProductForm(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day],
    }));
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    const hasSchedule = !!(product.available_days || product.available_from || product.available_to);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category_id: product.category_id || '',
      is_available: product.is_available,
      show_in_display: product.show_in_display,
      is_featured: product.is_featured || false,
      is_cross_sell: product.is_cross_sell || false,
      display_order: product.display_order,
      image_url: product.image_url || '',
      use_schedule: hasSchedule,
      available_days: product.available_days || [],
      available_from: product.available_from?.slice(0, 5) || '08:00',
      available_to: product.available_to?.slice(0, 5) || '22:00',
      has_sizes: product.has_sizes || false,
      price_large: product.price_large?.toString() || '',
    });
    setProductOpen(true);
  };

  const handleProductSubmit = async () => {
    if (!productForm.name.trim() || !productForm.price) {
      toast({ title: 'Error', description: 'Nombre y precio son requeridos', variant: 'destructive' });
      return;
    }
    const data = {
      name: productForm.name.trim(),
      description: productForm.description.trim() || null,
      price: parseFloat(productForm.price),
      category_id: productForm.category_id || null,
      is_available: productForm.is_available,
      show_in_display: productForm.show_in_display,
      is_featured: productForm.is_featured,
      is_cross_sell: productForm.is_cross_sell,
      display_order: productForm.display_order,
      image_url: productForm.image_url || null,
      available_days: productForm.use_schedule && productForm.available_days.length > 0
        ? productForm.available_days : null,
      available_from: productForm.use_schedule ? productForm.available_from : null,
      available_to: productForm.use_schedule ? productForm.available_to : null,
      has_sizes: productForm.has_sizes,
      price_large: productForm.has_sizes && productForm.price_large ? parseFloat(productForm.price_large) : null,
    };
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
        toast({ title: 'Producto actualizado' });
      } else {
        await createProduct.mutateAsync(data);
        toast({ title: 'Producto creado' });
      }
      setProductOpen(false);
      resetProductForm();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el producto', variant: 'destructive' });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: 'Producto eliminado' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el producto', variant: 'destructive' });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const created = await createCategory.mutateAsync({ name: newCategoryName.trim() });
      setProductForm(prev => ({ ...prev, category_id: created.id }));
      setNewCategoryName('');
      setCategoryModalOpen(false);
      toast({ title: 'Categoría creada' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la categoría', variant: 'destructive' });
    }
  };

  const getCategoryName = (categoryId: string | null) =>
    categories.find(c => c.id === categoryId)?.name || 'Sin categoría';

  // ── Promotion helpers ──
  const resetPromoForm = () => { setPromoForm(defaultPromoForm); setEditingPromo(null); };

  const openEditPromo = (promo: Promotion) => {
    setEditingPromo(promo);
    setPromoForm({
      title: promo.title,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value?.toString() || '',
      badge_text: promo.badge_text || '',
      image_url: promo.image_url || '',
      is_active: promo.is_active,
      display_order: promo.display_order,
    });
    setPromoOpen(true);
  };

  const handlePromoSubmit = async () => {
    if (!promoForm.title.trim()) {
      toast({ title: 'Error', description: 'El título es requerido', variant: 'destructive' });
      return;
    }
    const data = {
      title: promoForm.title.trim(),
      description: promoForm.description.trim() || null,
      discount_type: promoForm.discount_type,
      discount_value: promoForm.discount_value ? parseFloat(promoForm.discount_value) : null,
      badge_text: promoForm.badge_text.trim() || null,
      image_url: promoForm.image_url || null,
      is_active: promoForm.is_active,
      display_order: promoForm.display_order,
    };
    try {
      if (editingPromo) {
        await updatePromotion.mutateAsync({ id: editingPromo.id, ...data });
        toast({ title: 'Promoción actualizada' });
      } else {
        await createPromotion.mutateAsync(data);
        toast({ title: 'Promoción creada' });
      }
      setPromoOpen(false);
      resetPromoForm();
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la promoción', variant: 'destructive' });
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm('¿Eliminar esta promoción?')) return;
    try {
      await deletePromotion.mutateAsync(id);
      toast({ title: 'Promoción eliminada' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar la promoción', variant: 'destructive' });
    }
  };

  const formatDiscount = (promo: Promotion) => {
    if (promo.discount_type === 'price' && promo.discount_value) return `$${promo.discount_value.toFixed(2)}`;
    return promo.badge_text || '—';
  };

  return (
    <>
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Coffee className="w-4 h-4" />Productos
          </TabsTrigger>
          <TabsTrigger value="promotions" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />Promociones
          </TabsTrigger>
        </TabsList>

        {/* ── PRODUCTOS ── */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Productos</h2>
            <Dialog open={productOpen} onOpenChange={(o) => { setProductOpen(o); if (!o) resetProductForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nuevo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">
                    {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Image */}
                  <div className="space-y-2">
                    <Label>Imagen del producto</Label>
                    <ImageUploader
                      currentImage={productForm.image_url || null}
                      onImageChange={(url) => setProductForm({ ...productForm, image_url: url || '' })}
                    />
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      placeholder="Nombre del producto"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea
                      rows={2}
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    />
                  </div>

                  {/* Price + Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Precio *</Label>
                      <Input
                        type="number" step="0.01" placeholder="0.00"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <div className="flex gap-2">
                        <Select
                          value={productForm.category_id}
                          onValueChange={(v) => setProductForm({ ...productForm, category_id: v })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" size="icon" variant="outline"
                          onClick={() => setCategoryModalOpen(true)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Disponible */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <Label className="font-medium">Disponible en menú</Label>
                      <p className="text-xs text-muted-foreground">Los clientes pueden ordenar este producto</p>
                    </div>
                    <Switch
                      checked={productForm.is_available}
                      onCheckedChange={(v) => setProductForm({ ...productForm, is_available: v })}
                    />
                  </div>

                  {/* Display */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <Label className="font-medium flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-info" />
                        Mostrar en Display
                      </Label>
                      <p className="text-xs text-muted-foreground">Aparece en la pantalla del local</p>
                    </div>
                    <Switch
                      checked={productForm.show_in_display}
                      onCheckedChange={(v) => setProductForm({ ...productForm, show_in_display: v })}
                    />
                  </div>

                  {/* Featured */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <Label className="font-medium flex items-center gap-1.5">
                        <span>⭐</span>
                        Sugerencia del día
                      </Label>
                      <p className="text-xs text-muted-foreground">Aparece destacado en la parte superior del menú</p>
                    </div>
                    <Switch
                      checked={productForm.is_featured}
                      onCheckedChange={(v) => setProductForm({ ...productForm, is_featured: v })}
                    />
                  </div>

                  {/* Cross-sell */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <Label className="font-medium flex items-center gap-1.5">
                        <span>🛒</span>
                        Sugerencia de venta cruzada
                      </Label>
                      <p className="text-xs text-muted-foreground">Se sugiere al cliente al agregar una bebida</p>
                    </div>
                    <Switch
                      checked={productForm.is_cross_sell}
                      onCheckedChange={(v) => setProductForm({ ...productForm, is_cross_sell: v })}
                    />
                  </div>

                  {/* Sizes */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <Label className="font-medium">Selector de tamaños</Label>
                      <p className="text-xs text-muted-foreground">El cliente elige Mediano o Grande</p>
                    </div>
                    <Switch
                      checked={productForm.has_sizes}
                      onCheckedChange={(v) => setProductForm({ ...productForm, has_sizes: v })}
                    />
                  </div>
                  {productForm.has_sizes && (
                    <div className="space-y-2 p-3 rounded-lg border border-border bg-background">
                      <Label className="text-sm font-medium">Precio Mediano (precio base)</Label>
                      <p className="text-xs text-muted-foreground mb-2">El precio ingresado arriba es el precio Mediano</p>
                      <Label className="text-sm font-medium">Precio Grande *</Label>
                      <Input
                        type="number" step="0.01" placeholder="0.00"
                        value={productForm.price_large}
                        onChange={(e) => setProductForm({ ...productForm, price_large: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Schedule toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <Label className="font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        Horario de disponibilidad
                      </Label>
                      <p className="text-xs text-muted-foreground">Restringir a días y horas específicos</p>
                    </div>
                    <Switch
                      checked={productForm.use_schedule}
                      onCheckedChange={(v) => setProductForm({ ...productForm, use_schedule: v })}
                    />
                  </div>

                  {/* Schedule fields */}
                  {productForm.use_schedule && (
                    <div className="space-y-4 p-3 rounded-lg border border-border bg-background">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Días disponible</Label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS.map(day => (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleDay(day.value)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                productForm.available_days.includes(day.value)
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                              }`}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Sin selección = todos los días</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Hora inicio</Label>
                          <Input type="time" value={productForm.available_from}
                            onChange={(e) => setProductForm({ ...productForm, available_from: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">Hora fin</Label>
                          <Input type="time" value={productForm.available_to}
                            onChange={(e) => setProductForm({ ...productForm, available_to: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1"
                      onClick={() => { setProductOpen(false); resetProductForm(); }}>
                      Cancelar
                    </Button>
                    <Button className="flex-1" onClick={handleProductSubmit}>
                      {editingProduct ? 'Guardar' : 'Crear'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Product list */}
          <div className="space-y-2">
            {products.map((product) => {
              const scheduleLabel = formatSchedule(product);
              return (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Coffee className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{product.name}</p>
                      {!product.is_available && (
                        <Badge variant="destructive" className="text-xs">No disponible</Badge>
                      )}
                      {product.show_in_display && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Monitor className="w-3 h-3" />Display
                        </Badge>
                      )}
                      {product.is_featured && (
                        <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                          ⭐ Destacado
                        </Badge>
                      )}
                      {product.is_cross_sell && (
                        <Badge className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                          🛒 Venta cruzada
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${product.price.toFixed(2)} · {getCategoryName(product.category_id)}
                    </p>
                    {scheduleLabel && (
                      <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />{scheduleLabel}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditProduct(product)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── PROMOCIONES ── */}
        <TabsContent value="promotions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Promociones</h2>
            <Dialog open={promoOpen} onOpenChange={(o) => { setPromoOpen(o); if (!o) resetPromoForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nueva</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">
                    {editingPromo ? 'Editar Promoción' : 'Nueva Promoción'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Imagen (opcional)</Label>
                    <ImageUploader
                      currentImage={promoForm.image_url || null}
                      onImageChange={(url) => setPromoForm({ ...promoForm, image_url: url || '' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input placeholder="Ej: 2x1 en Café"
                      value={promoForm.title}
                      onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea rows={2} placeholder="Detalles de la promoción..."
                      value={promoForm.description}
                      onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de descuento</Label>
                      <Select value={promoForm.discount_type}
                        onValueChange={(v) => setPromoForm({ ...promoForm, discount_type: v as Promotion['discount_type'] })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price">Precio ($)</SelectItem>
                          <SelectItem value="text">Solo texto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {promoForm.discount_type !== 'text' && (
                      <div className="space-y-2">
                        <Label>Precio</Label>
                        <Input type="number" step="0.01"
                          placeholder="0.00"
                          value={promoForm.discount_value}
                          onChange={(e) => setPromoForm({ ...promoForm, discount_value: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Etiqueta (badge)</Label>
                    <Input placeholder="Ej: ¡Oferta! / Nuevo / Limitado"
                      value={promoForm.badge_text}
                      onChange={(e) => setPromoForm({ ...promoForm, badge_text: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <Label className="font-medium">Activa</Label>
                    <Switch checked={promoForm.is_active}
                      onCheckedChange={(v) => setPromoForm({ ...promoForm, is_active: v })}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1"
                      onClick={() => { setPromoOpen(false); resetPromoForm(); }}>
                      Cancelar
                    </Button>
                    <Button className="flex-1" onClick={handlePromoSubmit}>
                      {editingPromo ? 'Guardar' : 'Crear'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {promotions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No hay promociones todavía</p>
            </div>
          ) : (
            <div className="space-y-2">
              {promotions.map((promo) => (
                <div key={promo.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-lg font-bold"
                    style={{ background: 'linear-gradient(135deg, hsl(var(--accent)), hsl(var(--caramel, 35 70% 50%)))' }}>
                    %
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{promo.title}</p>
                      {promo.badge_text && <Badge className="text-xs">{promo.badge_text}</Badge>}
                      {!promo.is_active && <Badge variant="secondary" className="text-xs">Inactiva</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDiscount(promo)}{promo.description && ` · ${promo.description}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditPromo(promo)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeletePromo(promo.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── MODAL CREAR CATEGORÍA ── */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nombre de la categoría"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateCategory}>Crear</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}