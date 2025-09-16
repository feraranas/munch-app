Construyamos una aplicación web completa y funcional para llevar registro de mis gastos personales de forma sencilla y visual. Ayúdame a pensar cómo dividir esto en piezas iterativas y escribir un plan.md detallado.

Propósito: Crear un registro de gastos en pesos mexicanos intuitivo que me permita categorizar gastos y visualizar mis patrones de gasto a través de gráficos interactivos en tiempo real.

Requisitos:
1. Gestión de Gastos
- Registro rápido: Formulario con 3 campos obligatorios (concepto, monto, categoría)
- Validación: Monto debe ser número positivo, concepto mínimo 3 caracteres
- CRUD completo: Crear, editar, eliminar gastos con confirmación
- Persistencia: Los datos deben mantenerse entre sesiones usando localStorage

2. Categorías Predefinidas
[Insertar categorías aqui separadas por coma]
- Cada categoría con color único y consistente
- Dropdown ordenado alfabéticamente

3. Visualización de Datos
- Dashboard principal: Resumen total de gastos del mes actual
- Gráfico de dona: Distribución por categorías con porcentajes
- Lista de gastos recientes: Últimos 10 gastos con opción de editar/eliminar
- Filtros: Por categoría
- Totales dinámicos: Se actualizan instantáneamente al agregar/modificar gastos

Vista 1: Registro de Gastos (/add)
- Botón de "Agregar Gasto" prominente
- Feedback visual al guardar (loading + success)
- Limpieza automática del formulario tras envío exitoso

Vista 2: Dashboard de Visualización (/)
- Tarjeta de resumen con total del mes
- Gráfico de dona interactivo (mostrar valor al hover)
- Lista paginada de gastos con acciones rápidas
- Navegación fluida entre vistas

Diseño:
- Mínimo, funcional, práctico
- Uso intencional del color
- Cada categoría deberá tener un color único
- Inspirado en aplicaciones sociales

Frontend
- Framework: Next.js 15+ con App Router
- UI: Tailwind CSS
- Estado: React hooks (useState, useEffect, useContext)
- Almacenamiento: localStorage con hook personalizado
- Toma nota de lo que tenemos en @package.json  para dependencias instaladas y listas para usar

Crear Plan de Desarrollo (plan.md)
1. Fases de desarrollo con tareas específicas sin fechas
2. Dependencias entre componentes
3. Checkboxes para marcar progreso