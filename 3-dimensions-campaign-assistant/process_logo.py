import subprocess

# Convert JPG to binary PPM
subprocess.run(['convert', 'src/assets/logo.jpg', 'logo.ppm'], check=True)

with open('logo.ppm', 'rb') as f:
    header = f.readline().decode('ascii').strip()
    line = f.readline().decode('ascii')
    while line.startswith('#'):
        line = f.readline().decode('ascii')
    dimensions = line.strip().split()
    while len(dimensions) < 2:
        dimensions.extend(f.readline().decode('ascii').strip().split())
    w, h = int(dimensions[0]), int(dimensions[1])
    maxval = int(f.readline().decode('ascii').strip())
    raw = f.read()

print(f"Loaded PPM {w}x{h}, maxval={maxval}, bytes={len(raw)}")

# Create PAM for dark bg (white text) and PAM for light bg (dark text)
pam_header = f"P7\nWIDTH {w}\nHEIGHT {h}\nDEPTH 4\nMAXVAL 255\nTUPLTYPE RGB_ALPHA\nENDHDR\n".encode('ascii')

dark_bg_bytes = bytearray()
light_bg_bytes = bytearray()

for i in range(0, len(raw), 3):
    r = raw[i]
    g = raw[i+1]
    b = raw[i+2]
    
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    sat = max_c - min_c
    lum = (r + g + b) / 3.0
    
    # Calculate transparency for near-white background
    if min_c > 220 and sat < 25:
        alpha = int(max(0, min(255, (255 - min_c) * (255 / 35.0))))
    else:
        alpha = 255

    # Check if pixel belongs to dark text "INFINITE DIMENSIONS"
    if lum < 120 and sat < 35:
        text_intensity = max(0.0, min(1.0, (120.0 - lum) / 120.0))
        r_dark = int(r * (1 - text_intensity) + 255 * text_intensity)
        g_dark = int(g * (1 - text_intensity) + 255 * text_intensity)
        b_dark = int(b * (1 - text_intensity) + 255 * text_intensity)
    else:
        r_dark, g_dark, b_dark = r, g, b

    r_light, g_light, b_light = r, g, b

    dark_bg_bytes.extend([r_dark, g_dark, b_dark, alpha])
    light_bg_bytes.extend([r_light, g_light, b_light, alpha])

with open('dark_bg.pam', 'wb') as f:
    f.write(pam_header + dark_bg_bytes)

with open('light_bg.pam', 'wb') as f:
    f.write(pam_header + light_bg_bytes)

print("PAM files generated successfully!")
