from config import settings
from sync.sync_manager import SyncManager

print("SUPABASE_URL:", repr(settings.SUPABASE_URL))
print("SUPABASE_ANON_KEY (primeros 15 caracteres):", repr(settings.SUPABASE_ANON_KEY[:15]))
print("SUPABASE_SYNC_ENABLED:", settings.SUPABASE_SYNC_ENABLED)

sync_manager = SyncManager()
print("Supabase configurado:", sync_manager.supabase_configured)
print("Hay internet:", sync_manager.is_internet_available())

resultado = sync_manager.try_sync()
print("")
print("Resultado del intento de sincronizacion:")
print(resultado)