import sys
import os

# Ensure backend directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")
sys.path.insert(0, backend_dir)

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    print("=" * 60)
    print(f"MiPlata - Control de Finanzas Personales")
    print(f"Servidor ejecutandose en: http://localhost:{port}")
    print(f"Abre tu navegador en http://localhost:{port}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=port, debug=debug)

