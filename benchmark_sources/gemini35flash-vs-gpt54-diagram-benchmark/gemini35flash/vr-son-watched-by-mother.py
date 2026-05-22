import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

def draw_room():
    # 1. Figure setup
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.axis('off')
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    fig.patch.set_facecolor('#12121c')

    # --- 2. Room Structure ---
    # Back Wall
    ax.add_patch(patches.Rectangle((0, 2.2), 12, 6.8, color='#181826'))
    # Floor
    ax.add_patch(patches.Rectangle((0, 0), 12, 2.2, color='#252538'))
    # Baseboard line
    ax.plot([0, 12], [2.2, 2.2], color='#0d0d16', linewidth=4)
    # Cozy Room Rug
    ax.add_patch(patches.Ellipse((6.2, 1.1), 6.5, 1.4, color='#342c4b', alpha=0.9))

    # --- 3. Doorway & Mother (Left) ---
    # Hallway background (light)
    ax.add_patch(patches.Rectangle((0.5, 2.2), 1.6, 5.3, color='#fff5c0'))
    ax.add_patch(patches.Rectangle((0.5, 0), 1.6, 2.2, color='#ffec99')) # Hallway floor light
    # Door frame trim
    ax.add_patch(patches.Rectangle((0.45, 2.2), 0.08, 5.4, color='#2b1a11'))
    ax.add_patch(patches.Rectangle((2.07, 2.2), 0.08, 5.4, color='#2b1a11'))
    ax.add_patch(patches.Rectangle((0.45, 7.5), 1.7, 0.08, color='#2b1a11'))
    # Open door swung out/in
    # We draw the door panel slightly rotated/foreshortened
    door_poly = patches.Polygon([[0.5, 2.2], [0.5, 7.5], [0.05, 7.1], [0.05, 1.8]], color='#4a2f1b', ec='#2b1a11', lw=2)
    ax.add_patch(door_poly)
    
    # Door handle
    ax.plot([0.15, 0.15], [4.2, 4.4], color='#ffca28', linewidth=3)

    # Mother's silhouette/detailed figure standing in the doorway
    # Backlit, so mostly dark silhouette with warm glowing left/back edge
    # Legs / Skirt
    mother_skirt = patches.Polygon([[1.3, 0.8], [1.7, 0.8], [1.6, 3.2], [1.4, 3.2]], color='#1f1510')
    ax.add_patch(mother_skirt)
    # Torso
    mother_torso = patches.Polygon([[1.35, 3.2], [1.65, 3.2], [1.6, 4.8], [1.4, 4.8]], color='#1f1510')
    ax.add_patch(mother_torso)
    # Right arm leaning on door frame (X=2.1)
    ax.plot([1.55, 1.95, 2.05], [4.5, 4.8, 4.8], color='#1f1510', linewidth=10, solid_capstyle='round')
    # Left arm resting on side
    ax.plot([1.4, 1.3, 1.35], [4.5, 3.8, 3.3], color='#1f1510', linewidth=8, solid_capstyle='round')
    # Head
    ax.add_patch(patches.Circle((1.5, 5.2), 0.28, color='#1f1510'))
    # Hair (bun style)
    ax.add_patch(patches.Circle((1.4, 5.4), 0.12, color='#1f1510'))
    ax.add_patch(patches.Wedge((1.5, 5.2), 0.32, 45, 220, color='#1f1510'))
    
    # Warm yellow highlight on her back/left edges from the bright hallway light
    ax.plot([1.3, 1.35, 1.4], [0.8, 3.2, 4.8], color='#ffeb99', linewidth=3, alpha=0.9)
    ax.plot([1.28, 1.38], [3.8, 3.3], color='#ffeb99', linewidth=2.5, alpha=0.9)
    ax.add_patch(patches.Arc((1.5, 5.2), 0.58, 0.58, theta1=100, theta2=240, color='#ffeb99', linewidth=3, alpha=0.9))

    # --- 4. Window & Night Sky ---
    # Window Frame
    ax.add_patch(patches.Rectangle((5.2, 4.5), 2.6, 2.6, color='#0a0a14', ec='#33334c', lw=3))
    # Outside sky
    ax.add_patch(patches.Rectangle((5.3, 4.6), 2.4, 2.4, color='#080c18'))
    # Crescent moon
    ax.add_patch(patches.Circle((5.9, 6.2), 0.22, color='#fff9c4'))
    ax.add_patch(patches.Circle((6.02, 6.3), 0.22, color='#080c18')) # Moon shadow
    # Stars
    star_x = [5.6, 6.8, 7.3, 7.4, 6.3, 5.5]
    star_y = [5.2, 5.0, 5.8, 6.6, 5.0, 6.4]
    ax.scatter(star_x, star_y, color='#ffffff', s=8, alpha=0.8)
    ax.scatter([7.0, 5.8], [6.2, 5.6], color='#fff59d', s=15, marker='*', alpha=0.9)
    
    # Soft warm curtains on sides
    ax.add_patch(patches.Polygon([[5.2, 7.1], [5.6, 7.1], [5.4, 4.5], [5.2, 4.5]], color='#3a405a', alpha=0.8))
    ax.add_patch(patches.Polygon([[7.8, 7.1], [7.4, 7.1], [7.6, 4.5], [7.8, 4.5]], color='#3a405a', alpha=0.8))

    # --- 5. Bed (Right Side) ---
    # Headboard
    ax.add_patch(patches.Rectangle((8.0, 0.6), 0.15, 2.0, color='#2c1e17'))
    # Bed frame
    ax.add_patch(patches.Rectangle((8.15, 0.6), 3.5, 0.8, color='#2c1e17'))
    # Mattress
    ax.add_patch(patches.Rectangle((8.15, 1.4), 3.5, 0.4, color='#e9ecef'))
    # Cozy blanket
    ax.add_patch(patches.Rectangle((8.7, 1.4), 2.95, 0.45, color='#457b9d'))
    # Blanket fold
    ax.add_patch(patches.Polygon([[8.7, 1.85], [9.2, 1.85], [9.0, 1.4], [8.7, 1.4]], color='#a8dadc'))
    # Pillow
    ax.add_patch(patches.Ellipse((8.45, 1.9), 0.5, 0.3, color='#f1faee', angle=8))

    # --- 6. Desk & Laptop (Left side) ---
    # Desk frame
    ax.plot([3.2, 3.2], [0.4, 2.1], color='#2c1e17', linewidth=4)
    ax.plot([4.8, 4.8], [0.4, 2.1], color='#2c1e17', linewidth=4)
    # Desk top
    ax.add_patch(patches.Rectangle((3.0, 2.1), 2.0, 0.12, color='#4a3525', ec='#2c1e17', lw=1.5))
    # Laptop
    ax.add_patch(patches.Rectangle((3.6, 2.22), 0.6, 0.04, color='#adb5bd'))
    ax.add_patch(patches.Polygon([[4.1, 2.26], [4.3, 2.75], [3.9, 2.75], [3.7, 2.26]], color='#ced4da'))
    # Glow from laptop screen
    ax.add_patch(patches.Polygon([[3.7, 2.26], [4.3, 2.75], [4.9, 3.6], [3.1, 3.6]], facecolor='#a8dadc', alpha=0.12))
    
    # Desk plant
    ax.add_patch(patches.Rectangle((3.15, 2.22), 0.18, 0.18, color='#d68c45')) # Pot
    ax.add_patch(patches.Circle((3.24, 2.48), 0.1, color='#588157')) # Plant leaf
    ax.add_patch(patches.Circle((3.18, 2.44), 0.08, color='#588157'))
    ax.add_patch(patches.Circle((3.30, 2.44), 0.08, color='#588157'))

    # Gaming Chair (rotated / pushed away)
    ax.plot([4.0, 4.0], [0.4, 1.2], color='#343a40', linewidth=6) # Base pole
    ax.plot([3.7, 4.3], [0.4, 0.4], color='#343a40', linewidth=3) # Legs
    ax.add_patch(patches.Rectangle((3.6, 1.2), 0.8, 0.15, color='#e63946', ec='#1d3557', lw=1.5)) # Seat
    ax.add_patch(patches.Polygon([[3.6, 1.35], [3.75, 2.2], [3.95, 2.2], [3.8, 1.35]], color='#1d3557')) # Backrest

    # --- 7. Shelves (Far Right) ---
    # Shelf Frame
    ax.add_patch(patches.Rectangle((10.2, 3.2), 1.5, 4.2, color='#3d271d', ec='#22140e', lw=2))
    # Shelf dividers
    ax.plot([10.2, 11.7], [4.3, 4.3], color='#22140e', linewidth=3)
    ax.plot([10.2, 11.7], [5.4, 5.4], color='#22140e', linewidth=3)
    ax.plot([10.2, 11.7], [6.5, 6.5], color='#22140e', linewidth=3)
    # Decorative books & items on shelves
    # Bottom shelf
    ax.add_patch(patches.Rectangle((10.4, 3.25), 0.12, 0.95, color='#e63946'))
    ax.add_patch(patches.Rectangle((10.55, 3.25), 0.15, 0.85, color='#457b9d'))
    # Middle shelf 1
    ax.add_patch(patches.Rectangle((10.8, 4.35), 0.14, 0.85, color='#f4a261'))
    # Middle shelf 2 (leaning books)
    ax.add_patch(patches.Polygon([[10.4, 5.45], [10.5, 5.45], [10.8, 6.1], [10.7, 6.1]], color='#2a9d8f'))
    # Top shelf (Trophy)
    ax.add_patch(patches.Polygon([[10.7, 6.55], [11.1, 6.55], [11.0, 7.0], [10.8, 7.0]], color='#ffca28'))
    ax.add_patch(patches.Circle((10.9, 7.15), 0.12, color='#ffca28'))

    # --- 8. The Son (VR Player - Center Stage) ---
    # Active athletic stance: feet apart, body leaning dynamically forward/right
    # Left Leg (extended/anchor leg)
    ax.plot([5.5, 5.1], [2.1, 1.0], color='#2b2d42', linewidth=16, solid_capstyle='round') # Thigh/calf
    ax.plot([5.1, 4.8], [1.0, 0.95], color='#e63946', linewidth=12, solid_capstyle='round') # Shoe (red)
    
    # Right Leg (bent/forward leg)
    ax.plot([6.2, 6.6, 6.8], [2.1, 1.4, 0.85], color='#2b2d42', linewidth=16, solid_capstyle='round') # Bent leg
    ax.plot([6.8, 7.1], [0.85, 0.85], color='#e63946', linewidth=12, solid_capstyle='round') # Shoe (red)

    # Torso (leaning forward, bright teal hoodie)
    # We use a polygon for a solid organic body form
    torso_poly = patches.Polygon([[5.4, 2.0], [6.3, 2.1], [6.4, 3.5], [5.5, 3.3]], color='#2a9d8f')
    ax.add_patch(torso_poly)
    # Hood details
    ax.add_patch(patches.Wedge((5.7, 3.4), 0.35, 120, 330, color='#264653'))

    # Left Arm (stretching back/left, active action)
    ax.plot([5.5, 4.6], [3.1, 3.4], color='#2a9d8f', linewidth=14, solid_capstyle='round')
    # Hand
    ax.add_patch(patches.Circle((4.5, 3.45), 0.1, color='#f1a784'))
    # Controller & Cyan Saber/Beam base
    ax.add_patch(patches.Rectangle((4.38, 3.35), 0.08, 0.22, color='#1d3557', angle=-15))
    
    # Right Arm (stretching high forward/right, active action)
    ax.plot([6.2, 7.3], [3.2, 3.9], color='#2a9d8f', linewidth=14, solid_capstyle='round')
    # Hand
    ax.add_patch(patches.Circle((7.4, 3.95), 0.1, color='#f1a784'))
    # Controller & Magenta Saber/Beam base
    ax.add_patch(patches.Rectangle((7.32, 3.85), 0.08, 0.22, color='#1d3557', angle=25))

    # Head
    ax.add_patch(patches.Circle((6.0, 3.85), 0.28, color='#f1a784'))
    # Messy dark hair
    hair_poly = patches.Polygon([[5.7, 3.9], [6.3, 3.9], [6.3, 4.25], [6.1, 4.35], [5.8, 4.2], [5.7, 4.0]], color='#2b1a0a')
    ax.add_patch(hair_poly)
    ax.add_patch(patches.Wedge((6.0, 3.9), 0.3, 30, 160, color='#2b1a0a'))

    # VR Headset (Oculus/Quest style, dark futuristic look)
    # Since head is tilted up/right, angle headset accordingly
    vr_box = patches.Polygon([[5.95, 3.75], [6.35, 3.9], [6.25, 4.25], [5.85, 4.1]], color='#1d2026', ec='#343a40', lw=1.5)
    ax.add_patch(vr_box)
    # Glowing neon cyan faceplate stripe
    ax.plot([6.05, 6.3], [3.9, 4.0], color='#00f0ff', linewidth=3, alpha=0.9)
    # VR Headset Strap
    ax.plot([5.98, 5.72], [3.95, 3.88], color='#343a40', linewidth=4)

    # --- 9. VR Hologram Effects & Guardian Grid (The Wow Factor) ---
    # Guardian circle on floor around the kid
    guardian_grid = patches.Ellipse((5.9, 0.9), 2.8, 0.6, color='#00f0ff', fill=False, linestyle='--', linewidth=2, alpha=0.5)
    ax.add_patch(guardian_grid)
    guardian_grid_inner = patches.Ellipse((5.9, 0.9), 2.2, 0.45, color='#00f0ff', fill=False, linestyle=':', linewidth=1.5, alpha=0.3)
    ax.add_patch(guardian_grid_inner)
    
    # Glowing VR Cyan light beam from controller
    ax.plot([4.4, 3.0], [3.5, 4.2], color='#00f0ff', linewidth=5, alpha=0.8)
    ax.plot([4.4, 3.0], [3.5, 4.2], color='#ffffff', linewidth=2, alpha=0.95)
    # Glowing VR Magenta light beam from controller
    ax.plot([7.45, 8.8], [4.0, 5.0], color='#ff007f', linewidth=5, alpha=0.8)
    ax.plot([7.45, 8.8], [4.0, 5.0], color='#ffffff', linewidth=2, alpha=0.95)

    # Floating Holographic Cubes / Targets (Beat Saber game elements)
    # Target 1 (Cyan cube, slashed)
    cube_cyan_base = patches.Polygon([[2.8, 4.2], [3.2, 4.4], [3.2, 4.8], [2.8, 4.6]], color='#00f0ff', alpha=0.6)
    cube_cyan_side = patches.Polygon([[3.2, 4.4], [3.5, 4.2], [3.5, 4.6], [3.2, 4.8]], color='#00a8ff', alpha=0.6)
    cube_cyan_top = patches.Polygon([[2.8, 4.6], [3.2, 4.8], [3.5, 4.6], [3.1, 4.4]], color='#80e5ff', alpha=0.7)
    ax.add_patch(cube_cyan_base)
    ax.add_patch(cube_cyan_side)
    ax.add_patch(cube_cyan_top)
    
    # Target 2 (Magenta cube)
    cube_mag_base = patches.Polygon([[8.7, 5.0], [9.1, 5.2], [9.1, 5.6], [8.7, 5.4]], color='#ff007f', alpha=0.6)
    cube_mag_side = patches.Polygon([[9.1, 5.2], [9.4, 5.0], [9.4, 5.4], [9.1, 5.6]], color='#d9006c', alpha=0.6)
    cube_mag_top = patches.Polygon([[8.7, 5.4], [9.1, 5.6], [9.4, 5.4], [9.0, 5.2]], color='#ff80bf', alpha=0.7)
    ax.add_patch(cube_mag_base)
    ax.add_patch(cube_mag_side)
    ax.add_patch(cube_mag_top)

    # Particle sparkles in air
    sparkle_x = [2.6, 3.2, 3.4, 4.0, 4.2, 7.8, 8.0, 8.5, 9.2, 9.0]
    sparkle_y = [4.5, 4.1, 4.9, 3.8, 3.3, 4.3, 3.7, 5.3, 4.8, 5.7]
    sparkle_colors = ['#00f0ff', '#00f0ff', '#80e5ff', '#00f0ff', '#00f0ff', '#ff007f', '#ff80bf', '#ff007f', '#ff007f', '#ff007f']
    ax.scatter(sparkle_x, sparkle_y, color=sparkle_colors, s=25, marker='*', alpha=0.8)

    # Soft glowing ambiance around headset
    ax.add_patch(patches.Circle((6.2, 4.0), 0.6, facecolor='#00f0ff', alpha=0.1))

    # --- 10. Lighting cones ---
    # 10a. Light from the open door (warm hallway light pouring in)
    door_light_cone = patches.Polygon([[2.07, 2.2], [2.07, 7.5], [6.5, 0], [2.07, 0]], facecolor='#fff5c0', alpha=0.15)
    ax.add_patch(door_light_cone)

    # --- 11. Storytelling Eye-lines & Emotional connection ---
    # Mother's line of sight (watching warmly/curiously)
    # Dotted line in golden glow representing her focus
    ax.plot([1.6, 5.8], [5.2, 4.0], color='#ffeb99', linestyle=':', linewidth=2, alpha=0.6)
    
    # Floating surprise/warm reaction indicator next to Mother's head
    # A tiny stylized heart or soft steam/music note, let's do a cute orange heart/sparkle
    ax.text(1.9, 5.5, '♥', color='#ff6b6b', fontsize=18, fontweight='bold', alpha=0.8)
    ax.text(2.1, 5.7, '?', color='#ffca28', fontsize=14, fontweight='bold', alpha=0.7)

    # Save output
    output_path = sys.argv[1] if len(sys.argv) > 1 else 'vr_room_scene.png'
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0, facecolor='#12121c')
    plt.close()

if __name__ == '__main__':
    draw_room()
