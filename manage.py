#!/usr/bin/env python
# ruff: noqa
import os
import sys
from pathlib import Path

if __name__ == "__main__":
    # Update the settings module to point to the guitar_app settings
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitar_app.settings")

    try:
        from django.core.management import execute_from_command_line
    except ImportError:
        # The above import may fail for some other reason. Ensure that the
        # issue is really that Django is missing to avoid masking other
        # exceptions on Python 2.
        try:
            import django
        except ImportError:
            raise ImportError(
                "Couldn't import Django. Are you sure it's installed and "
                "available on your PYTHONPATH environment variable? Did you "
                "forget to activate a virtual environment?"
            )

        raise

    # Update the sys.path to include the guitar_app directory
    current_path = Path(__file__).parent.resolve()
    sys.path.append(str(current_path / "guitar_app"))

    execute_from_command_line(sys.argv)