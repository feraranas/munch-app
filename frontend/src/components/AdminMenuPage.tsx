import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import Header from './Header';
import {
  useAdminMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useArchiveMenuItem,
} from '../hooks/useQueries';
import { AdminMenuItem } from '../services/api';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price);

const AdminMenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: items = [], isLoading, error, refetch } = useAdminMenuItems();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const archiveItem = useArchiveMenuItem();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = Number(price);
    if (!name.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (Number.isNaN(parsed) || parsed < 0) {
      setFormError('El precio debe ser un número mayor o igual a 0.');
      return;
    }
    try {
      await createItem.mutateAsync({ name: name.trim(), price: parsed });
      setName('');
      setPrice('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear el item');
    }
  };

  const startEdit = (item: AdminMenuItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setFormError(null);
  };

  const saveEdit = async (id: string) => {
    setFormError(null);
    const parsed = Number(editPrice);
    if (!editName.trim() || Number.isNaN(parsed) || parsed < 0) {
      setFormError('Nombre y precio válidos son obligatorios.');
      return;
    }
    try {
      await updateItem.mutateAsync({ id, payload: { name: editName.trim(), price: parsed } });
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  const toggleActive = async (item: AdminMenuItem) => {
    setFormError(null);
    try {
      if (item.active) {
        await archiveItem.mutateAsync(item.id);
      } else {
        await updateItem.mutateAsync({ id: item.id, payload: { active: true } });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo actualizar el estado');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid-notebook-bg">
        <Header title="Menú" onBackClick={() => navigate('/admin')} />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-gray-600">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid-notebook-bg">
        <Header title="Menú" onBackClick={() => navigate('/admin')} />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : 'No se pudo cargar el menú'}
          </p>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            onClick={() => refetch()}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-notebook-bg">
      <Header title="Menú" onBackClick={() => navigate('/admin')} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={onCreate} className="bg-white rounded-lg shadow-md p-4 mb-6 space-y-3">
          <h2 className="text-lg font-semibold">Agregar item</h2>
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Precio"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={createItem.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {createItem.isPending ? 'Guardando...' : 'Crear'}
          </button>
        </form>

        <div className="bg-white rounded-lg shadow-md divide-y">
          {items.map((item) => (
            <div key={item.id} className={`p-4 ${item.active ? '' : 'bg-gray-50 opacity-75'}`}>
              {editingId === item.id ? (
                <div className="space-y-2">
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                      onClick={() => saveEdit(item.id)}
                    >
                      Guardar
                    </button>
                    <button
                      className="bg-gray-400 text-white px-3 py-1 rounded-md text-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatPrice(item.price)}
                      {!item.active && ' · Archivado'}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      className="text-sm px-3 py-1 rounded-md border border-gray-300"
                      onClick={() => startEdit(item)}
                    >
                      Editar
                    </button>
                    <button
                      className={`text-sm px-3 py-1 rounded-md text-white ${
                        item.active ? 'bg-red-600' : 'bg-gray-600'
                      }`}
                      onClick={() => toggleActive(item)}
                    >
                      {item.active ? 'Archivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sentry.withProfiler(AdminMenuPage);
