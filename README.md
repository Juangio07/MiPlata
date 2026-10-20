# MiPlata – Control de Finanzas Personales (Versión Migrada)

MiPlata es una SPA de finanzas personales con **HTML, CSS y JavaScript** en el frontend, una API Flask para desarrollo local y funciones Netlify para producción. La persistencia de producción está en **Supabase**; SQLite se conserva únicamente como modo local de respaldo.

---

## 🚀 Cómo ejecutar la aplicación

### Prerrequisitos
- **Python 3.8+** instalado.
- Dependencias mínimas de Python (Flask):
  ```bash
  pip install -r requirements.txt
  ```
- Para usar autenticación y datos reales en local, copia `.env.example` como `.env` y completa las variables de Supabase.

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

También funciona en `http://127.0.0.1:5000`.

### Variables de entorno

| Variable | Uso |
| --- | --- |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Clave pública del cliente |
| `SUPABASE_SECRET_KEY` | Clave privada, solo backend/Netlify |
| `CORS_ORIGINS` | Orígenes permitidos separados por coma |

La clave privada nunca debe llegar al navegador ni subirse a GitHub. En Netlify deben configurarse las tres variables de Supabase en el proyecto.

---

## 🏛️ Estructura del Proyecto Migrado

```
MiPlata/
├── backend/
│   ├── app.py              # Servidor Flask con API REST y entrega de estáticos
│   ├── supabase_database.py # Adaptador de datos de producción
│   ├── database.py         # Adaptador SQLite para modo local sin Supabase
│   └── miplata.db          # Datos locales; no se usa en producción configurada
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
│   ├── sw.js               # Caché de recursos estáticos, sin cachear datos de usuarios
│   └── assets/
│       └── logo.svg        # Isotipo oficial vectorizado de MiPlata
├── requirements.txt        # Dependencias de Python (Flask)
├── tests/                  # Pruebas automatizadas de endpoints críticos
├── .env.example            # Plantilla de configuración sin secretos
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
   - Persistencia de producción con Supabase y fallback local con SQLite.
   - Validación de autenticación, tamaño de solicitudes y respuestas de error consistentes.
   - Caché de recursos estáticos; las solicitudes `/api/*` nunca se guardan en caché.

## 🧪 Comprobaciones

Ejecuta las pruebas críticas con:

```bash
python -m unittest discover -s tests -v
```

También se validan la sintaxis de los módulos JavaScript y Python en CI mediante GitHub Actions.

## ✉️ Recuperación de contraseña

La aplicación usa el flujo de recuperación de Supabase: solicita el correo, valida el enlace y permite crear una nueva contraseña. En producción se recomienda configurar SMTP propio en Supabase para evitar los límites del proveedor de correo integrado.

## 🚀 Despliegue

Netlify publica `frontend/` y ejecuta `netlify/functions/api.mjs`. Los despliegues automáticos deben quedar conectados únicamente a la rama estable (`main`); las ramas de trabajo como `sec` pueden probarse sin publicar producción.
