# Build with: pyinstaller pug_sankey.spec

a = Analysis(
    ["src/pug_sankey/__main__.py"],
    pathex=["src"],
    binaries=[],
    datas=[("src/pug_sankey/web", "pug_sankey/web")],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="pug-sankey",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)
