# Option 3 — Installer Stable Diffusion (mode local)

Ce guide vous permet d’**installer Stable Diffusion sur votre PC** pour que l’option **« Local »** de l’app génère de **vraies illustrations** (sans Replicate, tout tourne chez vous).

---

## Ce qu’il vous faut

- **Windows 10 ou 11**
- **Une carte graphique NVIDIA** (recommandé : 6 Go de VRAM ou plus). Avec 4 Go ça peut marcher en réduisant la résolution.
- **Environ 20 Go d’espace disque** libre
- **7-Zip** (pour décompresser Forge) : [https://www.7-zip.org/](https://www.7-zip.org/)

---

## Méthode recommandée : Stable Diffusion Forge (tout-en-un)

Forge est une version optimisée de Stable Diffusion WebUI, avec un **installeur en un clic**. Pas besoin d’installer Python ou Git à la main.

### Étape 1 — Télécharger Forge

1. Allez sur : [Releases Forge (One-Click Package)](https://github.com/lllyasviel/stable-diffusion-webui-forge/releases).
2. Téléchargez le **One-Click Package** adapté à votre PC :
   - **Recommandé** : `webui_forge_cu121_torch231.7z` (CUDA 12.1)
   - Si votre pilote NVIDIA est très récent : `webui_forge_cu124_torch24.7z`
3. Le fichier fait plusieurs Go ; le téléchargement peut prendre un moment.

### Étape 2 — Installer

1. **Installez 7-Zip** si ce n’est pas déjà fait : [https://www.7-zip.org/](https://www.7-zip.org/).
2. **Clic droit** sur le fichier `.7z` téléchargé → **7-Zip** → **Extraire vers "webui_forge_..."**.
3. Ouvrez le **dossier extrait** (par ex. `webui_forge_cu121_torch231`).
4. Lancez **`update.bat`** (double-clic). Attendez la fin des mises à jour.
5. Ne lancez pas encore l’interface : on va d’abord activer l’API.

### Étape 3 — Activer l’API (pour que l’app puisse générer les images)

L’app Histoires Enfant appelle Stable Diffusion via une **API**. Il faut la activer au lancement.

1. Dans le même dossier, ouvrez le fichier **`webui-user.bat`** avec le Bloc-notes.
2. Repérez la ligne `set COMMANDLINE_ARGS=` (ou ajoutez-la si elle n’existe pas).
3. Mettez exactement :
   ```bat
   set COMMANDLINE_ARGS=--api
   ```
4. Enregistrez et fermez.

### Étape 4 — Télécharger un modèle (obligatoire)

Sans modèle, Forge ne peut pas générer d’images.

1. Téléchargez un **modèle Stable Diffusion** (checkpoint) selon votre carte graphique et vos goûts :
   - **Pour débuter (léger, ~4 Go VRAM)**  
     **SD 1.5** : [Hugging Face – SD 1.5](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5) → **Files and versions** → `v1-5-pruned-emaonly.safetensors`.
   - **Meilleure qualité (SDXL, 6–8 Go VRAM)**  
     **SDXL 1.0** : [Hugging Face – SDXL](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) → `sd_xl_base_1.0.safetensors`.  
     **DreamShaper XL** : très bon pour l’illustration, fantasy, styles variés — [CivitAI DreamShaper XL](https://civitai.com/models/112902/dreamshaper).  
     **Juggernaut XL** : photoréalisme et rendu cinématographique — [CivitAI](https://civitai.com/models/133005/juggernaut-xl).
   - **Spécial illustration / histoires pour enfants**  
     **CartoonXL** : style cartoon, mignon, idéal pour livres illustrés — [CivitAI CartoonXL](https://civitai.com/models/391852/cartoonxl).  
     **Children’s Picture Book** (LoRA à utiliser avec une base SDXL) : style “livre pour enfants” — [CivitAI](https://civitai.com/models/363556/childrens-picture-book-hand-drawn-style-childrens-picture-book-illustrations).
   - Tous les checkpoints en **.safetensors** se placent dans `models/Stable-diffusion/`. Les LoRA vont dans `models/Lora/` (et nécessitent une base SDXL chargée).
2. Dans le dossier Forge, allez dans **`models/Stable-diffusion/`**.
3. **Copiez** le fichier `.safetensors` dans ce dossier.

### Étape 5 — Configurer le `.env` et lancer tout en une commande

1. Ouvrez le fichier **`.env`** à la racine du projet Histoires Enfant.
2. Ajoutez ou modifiez ces lignes (sans espaces autour du `=`) :
   ```env
   STABLE_DIFFUSION_URL=http://127.0.0.1:7860
   FORGE_PATH=C:\chemin\vers\votre\dossier_forge
   ```
   Remplacez **`C:\chemin\vers\votre\dossier_forge`** par le chemin réel du dossier où vous avez extrait Forge (celui qui contient **`run.bat`**). Exemple : `FORGE_PATH=C:\webui_forge_cu121_torch231`.
3. Enregistrez le `.env`.

### Étape 6 — Lancer l’app

Dans le projet Histoires Enfant, lancez simplement :

```bash
npm run dev
```

**Vous n’avez pas besoin d’ouvrir Forge à l’avance.** Quand vous générez des illustrations en mode **Local** :
1. L’app envoie la requête au serveur d’images (port 8188).
2. Si Forge ne tourne pas encore et que **`FORGE_PATH`** est défini dans `.env`, le serveur **démarre Forge à la demande** (une fenêtre s’ouvre), attend qu’il réponde (jusqu’à 5 min la première fois), puis génère l’image avec Stable Diffusion et la renvoie à l’app.
3. Les images générées s’affichent dans l’app comme prévu. Forge reste ouvert pour les générations suivantes ; vous pouvez le fermer quand vous avez fini.

### Étape 7 — Utiliser l’option Local

1. Ouvrez [http://localhost:3000](http://localhost:3000).
2. Créez ou ouvrez un projet, allez à l’étape **Génération**.
3. Choisissez **« Local (votre serveur SD / ComfyUI) »**.
4. Lancez la génération : la première fois, Forge peut s’ouvrir automatiquement ; les illustrations sont ensuite créées par **Stable Diffusion** et remises dans l’app.
---

## Dépannage

- **« Connection refused » ou pas d’image**  
  Vérifiez que `FORGE_PATH` est bien défini dans `.env`. Au premier appel en mode Local, Forge doit démarrer automatiquement ; si une fenêtre ne s’ouvre pas, lancez `run.bat` à la main dans le dossier Forge, attendez que l’interface soit prête (127.0.0.1:7860), puis relancez la génération.

- **Erreur de mémoire GPU**  
  Réduisez la taille des images dans l’app si possible, ou utilisez un modèle plus léger (SD 1.5).

- **Pas de modèle chargé**  
  Vérifiez qu’un fichier `.safetensors` est bien dans `models/Stable-diffusion/` du dossier Forge.

- **L’API ne répond pas**  
  Vérifiez que dans `webui-user.bat` vous avez bien `set COMMANDLINE_ARGS=--api` et que vous avez relancé `run.bat` après la modification.

---

## Alternative : Automatic1111 (installation manuelle)

Si vous préférez l’interface **Automatic1111** (SD WebUI classique) :

1. Installez **Python 3.10.6** (cochez « Add to PATH ») : [python.org](https://www.python.org/downloads/).
2. Installez **Git** : [git-scm.com](https://git-scm.com/).
3. Ouvrez **Invite de commandes** ou **PowerShell**, puis :
   ```bash
   cd C:\
   git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
   cd stable-diffusion-webui
   ```
4. Ouvrez **`webui-user.bat`** dans un éditeur et ajoutez :
   ```bat
   set COMMANDLINE_ARGS=--api
   ```
5. Placez un modèle `.safetensors` dans **`models/Stable-diffusion/`**.
6. Lancez **`webui-user.bat`**. L’API sera sur **http://127.0.0.1:7860**.
7. Dans le `.env` du projet Histoires Enfant : **`STABLE_DIFFUSION_URL=http://127.0.0.1:7860`**.

Ensuite, même principe : lancer d’abord SD WebUI, puis `npm run dev`, et choisir **Local** à l’étape Génération.

---

## ComfyUI

**ComfyUI** est une autre interface (nœuds, workflows). L’app Histoires Enfant est prévue pour parler à l’**API Stable Diffusion WebUI** (txt2img / img2img). Pour utiliser ComfyUI avec cette app, il faudrait soit :

- faire tourner **Stable Diffusion Forge ou Automatic1111** comme ci-dessus (recommandé),  
- soit mettre en place un petit **bridge** qui reçoit les requêtes de l’app et les envoie à ComfyUI. Ce n’est pas décrit dans ce guide.

Pour commencer sans prise de tête, utilisez **Forge** ou **Automatic1111** avec les étapes ci-dessus.
