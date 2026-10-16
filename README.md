# MiPlata – Control de Finanzas Personales (Versión Migrada)

Este proyecto es la migración tecnológica fiel del proyecto original a **HTML5, CSS3 y JavaScript (ES6 Modules) en el frontend, y Python (Flask + SQLite) en el backend**.

---

## 🚀 Cómo ejecutar la aplicación

### Prerrequisitos
- **Python 3.8+** instalado.
- Dependencias mínimas de Python (Flask):
  ```bash
  pip install -r requirements.txt
  ```

### Iniciar el servidor
En la carpeta `MiPlata`:
```bash
python run.py
```
O bien:
```bash
python backend/app.py
```

Abre tu navegador en:
```
http://localhost:5000
```

---

## 🏛️ Estructura del Proyecto Migrado

```
MiPlata/
├── backend/
│   ├── app.py              # Servidor Flask con API REST y entrega de estáticos
│   ├── database.py         # Base de datos SQLite y semillas de datos (Camila Restrepo)
│   └── miplata.db          # Base de datos persistente (se autogenera al iniciar)
├── frontend/
│   ├── index.html          # Interfaz SPA semántica y accesible
│   ├── css/
│   │   └── style.css       # Estilos vanilla, colores HSL, microanimaciones y diseño responsive
│   ├── js/
│   │   ├── api.js          # Cliente de comunicación con backend Python
│   │   ├── formatters.js   # Formateadores COP, moneda colombiana y fechas en español
│   │   ├── icons.js        # Registro vectorial de iconos SVG y Logo oficial de MiPlata
│   │   ├── insights.js     # Motor financiero: alertas, tips 50/30/20 y rotación de turnos
│   │   └── app.js          # Controlador principal de vistas, modales y teclado físico
│   └── assets/
│       └── logo.svg        # Isotipo oficial vectorizado de MiPlata
├── requirements.txt        # Dependencias de Python (Flask)
├── run.py                  # Script de inicio rápido del servidor
└── README.md               # Documentación del proyecto
```

---

## 💡 Características y Fidelidad Visual y Funcional

1. **Apariencia idéntica**:
   - Paleta de colores oficial: Azul eléctrico (`#0058bc`), verde esmeralda (`#006c49`), azul oscuro (`#0b1c30`), fondo (`#f8f9ff`).
   - Tarjeta principal estilo Apple Wallet con gradientes oscuros, resplandor ambiental y saldo disponible en tiempo real.
   - Logo oficial 3D con cinta plegada 'M' y moneda grabada con signo '$'.
   - Tipografía Inter y números tabulares (`tabular-nums`) para cifras financieras legibles.

2. **Navegación e Interacción**:
   - **Inicio (Dashboard)**: Saludo según hora del día y estado financiero, conmutador de mes, tarjeta de saldo con botón de ocultar ojo y modal de desglose fórmula, accesos rápidos (Gasto, Ingreso, Obligaciones, Mis Metas), widget de presupuesto mensual, banner de fijos y metas activas.
   - **Ingresos**: Historial de dinero recibido, categorías (Nómina, Honorarios, Negocio, Inversión, Otros).
   - **Gastos**: Historial organizado, exportación a archivo CSV con cabecera UTF-8 BOM compatible con Microsoft Excel.
   - **Obligaciones Fijas**: Alertas de urgencia (Vence hoy, Vence en X días), conmutador de pago que se sincroniza con los gastos automáticamente sin duplicados.
   - **Metas de Ahorro**: Barra de avance global, tarjetas de metas con aportes manuales rápidos ($50k, $100k, etc.) y consejos inteligentes basados en capacidad de ahorro quincenal.
   - **Perfil**: Regla 50/30/20 calculada con precisión para Colombia (Necesidades 50%, Deseos 30%, Ahorro 20%), gestión de salario, avatar editable y opciones de reinicio de datos o cierre de sesión.
   - **Modal Rápido (<10s)**: Teclado numérico táctil interactivo, soporte para teclado físico (números, Backspace, Enter, Esc), selector de categorías y guardado veloz.
   - **Búsqueda Instantánea**: Filtrado en tiempo real por concepto, categoría o monto.

3. **Backend en Python**:
   - Endpoints REST para autenticación, movimientos, obligaciones, metas, aportes y configuración.
   - Persistencia confiable con SQLite (`miplata.db`).
   - El proyecto original se conserva intacto en la raíz para referencia comparativa.
