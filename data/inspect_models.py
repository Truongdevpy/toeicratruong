# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '../backend')

import models
for attr in dir(models):
    obj = getattr(models, attr)
    if hasattr(obj, '__tablename__'):
        print(f"Class: {attr} -> Table: {obj.__tablename__}")
