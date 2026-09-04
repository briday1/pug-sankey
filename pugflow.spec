# Build with: pyinstaller pugflow.spec

a = Analysis(
    ["src/pugflow/__main__.py"],
    pathex=["src"],
    binaries=[],
    datas=[("src/pugflow/web", "pugflow/web")],
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
    name="pugflow",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)
