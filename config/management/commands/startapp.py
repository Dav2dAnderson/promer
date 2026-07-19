import os

from django.core.management.commands.startapp import Command as StartAppCommand
from django.core.management import CommandError

class Command(StartAppCommand):
    help = "App'ni avtomatik ravishda 'apps/' papkasi ichida yaratadi."

    def handle(self, **options):
        app_name = options.get('name')
        target = options.get('directory')

        # Agar path ko'rsatilmagan bo'lsa, avtomatik tarzda 'apps/<app_name>' bo'ladi.
        if target is None:
            target_dir = os.path.join('apps', app_name)
            options['directory'] = target_dir

            # apps papkasi borligini tekshiramiz, bo'lmasa yaratamiz.
            if not os.path.exists('apps'):
                os.makedirs('apps')
            if os.path.exists(target_dir):
                raise CommandError(
                    f"{app_name} allaqachon 'apps/' ichida mavjud."
                )
        else:
            target_dir = target
        
        super().handle(**options)

        # apps.py faylini avtomatik tahrirlash.
        apps_file_path = os.path.join(target_dir, 'apps.py')
        if os.path.exists(apps_file_path):
            with open(apps_file_path, 'r') as file:
                content = file.read()

            old_line = f"name = '{app_name}'"
            new_line = f"name = 'apps.{app_name}'"

            if old_line in content:
                content = content.replace(old_line, new_line)
                with open(apps_file_path, 'w') as file:
                    file.write(content)
        self.stdout.write(
            self.style.SUCCESS(
                f"Muvaffaqiyatli: 'apps/{app_name}' va apps.py sozlandi."
            )
        )