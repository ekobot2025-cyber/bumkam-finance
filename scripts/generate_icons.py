import os
from PIL import Image, ImageDraw

def generate_icons():
    source_img_path = r"C:\Users\ACER\.gemini\antigravity\brain\24f55b16-2a82-483a-8a3d-df0f07a86675\bumkam_logo_1789435328020.jpg"
    if not os.path.exists(source_img_path):
        print(f"Error: Source image not found at {source_img_path}")
        return

    img = Image.open(source_img_path).convert("RGBA")
    print(f"Loaded source image: {img.size}")

    # Webapp icons
    public_dir = r"D:\8 PROJECT\2026\tda_kelompok5\public"
    app_dir = r"D:\8 PROJECT\2026\tda_kelompok5\app"

    # 1. Favicon and Logo for Web
    logo_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    logo_512.save(os.path.join(public_dir, "logo.png"), "PNG")
    logo_512.save(os.path.join(public_dir, "icon.png"), "PNG")
    logo_512.save(os.path.join(app_dir, "icon.png"), "PNG")

    # 32x32 and 48x48 ico
    ico_img = img.resize((48, 48), Image.Resampling.LANCZOS)
    ico_img.save(os.path.join(public_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    ico_img.save(os.path.join(app_dir, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print("Saved web icons (logo.png, icon.png, favicon.ico)")

    # Android launcher icons
    res_dir = r"D:\8 PROJECT\2026\tda_kelompok5\android\app\src\main\res"

    # Android sizes: mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192
    densities = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432)
    }

    # Extract background color from top-left corner
    bg_color = img.getpixel((10, 10))
    print(f"Extracted background color: {bg_color}")

    for folder, (size, fg_size) in densities.items():
        target_folder = os.path.join(res_dir, folder)
        os.makedirs(target_folder, exist_ok=True)

        # Standard icon
        icon = img.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(os.path.join(target_folder, "ic_launcher.png"), "PNG")

        # Round icon with circular mask
        mask = Image.new("L", (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size, size), fill=255)
        round_icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        round_icon.paste(icon, (0, 0), mask)
        round_icon.save(os.path.join(target_folder, "ic_launcher_round.png"), "PNG")

        # Foreground for adaptive icon:
        # In adaptive icon (fg_size x fg_size), the icon content should occupy the inner 66%
        fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        # Inner logo size
        inner_size = int(fg_size * 0.72)
        scaled_logo = img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        offset = (fg_size - inner_size) // 2
        fg_canvas.paste(scaled_logo, (offset, offset))
        fg_canvas.save(os.path.join(target_folder, "ic_launcher_foreground.png"), "PNG")

        print(f"Generated icons for {folder}: {size}x{size} and fg: {fg_size}x{fg_size}")

    # Splash screens
    splash_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    splash_dir = os.path.join(res_dir, "drawable")
    splash_512.save(os.path.join(splash_dir, "splash.png"), "PNG")

    for port_folder in ["drawable-port-mdpi", "drawable-port-hdpi", "drawable-port-xhdpi", "drawable-port-xxhdpi", "drawable-port-xxxhdpi"]:
        p_dir = os.path.join(res_dir, port_folder)
        if os.path.exists(p_dir):
            splash_512.save(os.path.join(p_dir, "splash.png"), "PNG")

    print("All Android and Web icons generated successfully!")

if __name__ == "__main__":
    generate_icons()
