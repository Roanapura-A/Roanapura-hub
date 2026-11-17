# Ajoute ?v=<version> à tous les imports locaux de v2/ pour forcer le navigateur à recharger après chaque mise en ligne.
import re, sys, pathlib
racine = pathlib.Path(sys.argv[1]); v = sys.argv[2]
for f in list(racine.rglob('*.js')) + [racine / 'index.html']:
    s = f.read_text()
    s2 = re.sub(r"""((?:from|import)\s*['"]|src=["']|href=["'])(\.{1,2}/[^'"?]+?\.(?:js|css)|js/app\.js|css/style\.css)(\?v=[\w.-]+)?(['"])""", lambda m: f"{m.group(1)}{m.group(2)}?v={v}{m.group(4)}", s)
    if s2 != s: f.write_text(s2); print('versionné', f.relative_to(racine))
