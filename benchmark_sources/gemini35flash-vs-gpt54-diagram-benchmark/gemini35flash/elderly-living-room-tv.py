import sys
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.path import Path
import numpy as np

def create_drawing(filepath):
    # Create figure with exact 1200x900 resolution (12x9 inches at 100 DPI)
    # and no margins.
    fig = plt.figure(figsize=(12, 9), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9)
    ax.set_aspect('equal')
    ax.axis('off')
    
    # --- Background & Color Palette ---
    wall_color = '#1e1a24'      # Deep warm dark charcoal/purple
    floor_color = '#38221d'     # Rich dark wooden floor
    
    # 1. Base Wall Background
    ax.add_patch(patches.Rectangle((0, 0), 12, 9, color=wall_color, zorder=0))
    
    # 2. Floor
    ax.add_patch(patches.Rectangle((0, 0), 12, 2.2, color=floor_color, zorder=1))
    
    # Floor planks lines for wood texture
    for y in np.linspace(0.3, 2.1, 7):
        ax.plot([0, 12], [y, y], color='#251613', lw=1.5, zorder=1.2)
        
    # --- Cozy Round Rug (Lies under armchair and coffee table) ---
    # Draw a soft beige textured rug
    ax.add_patch(patches.Ellipse((6.8, 2.2), width=5.2, height=0.75, color='#eddcd2', zorder=1.5))
    # Outer fringe pattern on rug
    ax.add_patch(patches.Ellipse((6.8, 2.2), width=5.0, height=0.70, color='#ddb892', zorder=1.6))
    ax.add_patch(patches.Ellipse((6.8, 2.2), width=4.8, height=0.66, color='#eddcd2', zorder=1.7))

    # --- Window (Cozy Night Scene) ---
    # Window Frame location
    win_x, win_y, win_w, win_h = 4.2, 3.8, 2.8, 3.2
    # Outside sky
    ax.add_patch(patches.Rectangle((win_x, win_y), win_w, win_h, color='#0a0c16', zorder=2))
    
    # Distant mountains/trees outside
    ax.add_patch(patches.Polygon([(win_x, win_y), (win_x+0.8, win_y+0.4), (win_x+1.8, win_y+0.25), (win_x+win_w, win_y)], color='#020307', zorder=2.2))
    
    # Moon in window
    moon = patches.Circle((win_x + 2.0, win_y + 2.2), 0.28, color='#fefae0', zorder=2.3)
    ax.add_patch(moon)
    # Moon shadow for crescent effect
    moon_shadow = patches.Circle((win_x + 1.82, win_y + 2.3), 0.28, color='#0a0c16', zorder=2.4)
    ax.add_patch(moon_shadow)
    
    # Stars
    stars = [(4.5, 6.2), (4.8, 6.7), (5.5, 5.8), (6.5, 6.5), (5.1, 6.4)]
    for sx, sy in stars:
        ax.plot(sx, sy, '*', color='#ffffff', markersize=2, zorder=2.3)
        
    # Window border & panes
    ax.add_patch(patches.Rectangle((win_x, win_y), win_w, win_h, fill=False, edgecolor='#2c2836', lw=7, zorder=2.8))
    ax.plot([win_x + win_w/2, win_x + win_w/2], [win_y, win_y + win_h], color='#2c2836', lw=3, zorder=2.8)
    ax.plot([win_x, win_x + win_w], [win_y + win_h*0.65, win_y + win_h*0.65], color='#2c2836', lw=3, zorder=2.8)
    
    # Curtains (Warm Dusty Rose)
    curtain_color = '#a55b6a'
    # Left Curtain
    lc_points = [(win_x - 0.4, win_y + win_h + 0.2), (win_x + 0.3, win_y + win_h + 0.2), 
                 (win_x + 0.1, win_y - 0.1), (win_x - 0.5, win_y - 0.1)]
    ax.add_patch(patches.Polygon(lc_points, color=curtain_color, zorder=3))
    # Right Curtain
    rc_points = [(win_x + win_w + 0.4, win_y + win_h + 0.2), (win_x + win_w - 0.3, win_y + win_h + 0.2), 
                 (win_x + win_w - 0.1, win_y - 0.1), (win_x + win_w + 0.5, win_y - 0.1)]
    ax.add_patch(patches.Polygon(rc_points, color=curtain_color, zorder=3))
    
    # Curtain folds (texture lines)
    ax.plot([win_x - 0.1, win_x - 0.2], [win_y + win_h, win_y], color='#7d3c4a', lw=1, alpha=0.5, zorder=3.1)
    ax.plot([win_x + win_w + 0.1, win_x + win_w + 0.2], [win_y + win_h, win_y], color='#7d3c4a', lw=1, alpha=0.5, zorder=3.1)
    
    # Curtain Rod
    ax.plot([win_x - 0.6, win_x + win_w + 0.6], [win_y + win_h + 0.2, win_y + win_h + 0.2], color='#cb997e', lw=4, zorder=3.5)
    
    # --- Standing Floor Lamp ---
    lamp_x = 10.8
    # Pole and Base
    ax.plot([lamp_x, lamp_x], [2.2, 6.2], color='#7a6b7d', lw=3, zorder=3)
    ax.add_patch(patches.Polygon([(lamp_x - 0.4, 2.2), (lamp_x + 0.4, 2.2), (lamp_x, 2.38)], color='#4c424f', zorder=3.2))
    # Lampshade
    shade_pts = [(lamp_x - 0.5, 6.1), (lamp_x + 0.5, 6.1), (lamp_x + 0.3, 6.8), (lamp_x - 0.3, 6.8)]
    ax.add_patch(patches.Polygon(shade_pts, color='#f4a261', zorder=4))
    
    # Golden glow light cone
    light_glow = patches.Polygon([(lamp_x, 6.4), (lamp_x - 2.8, 2.2), (lamp_x + 1.2, 2.2)], 
                                 color='#ffb703', alpha=0.14, zorder=1.8)
    ax.add_patch(light_glow)
    # Ambient bulb glow (soft bright circle)
    ax.add_patch(patches.Circle((lamp_x, 6.0), 0.3, color='#ffe3a0', alpha=0.4, zorder=3.9))
    
    # --- Wall Clock ---
    clock_x, clock_y = 2.5, 7.3
    # Clock Frame
    ax.add_patch(patches.Circle((clock_x, clock_y), 0.42, color='#3d2e2b', zorder=3))
    ax.add_patch(patches.Circle((clock_x, clock_y), 0.36, color='#fcf8f2', zorder=3.2))
    # Hands (pointing to 7:25 PM)
    ax.plot([clock_x, clock_x - 0.15], [clock_y, clock_y - 0.1], color='#1e1a24', lw=2.5, zorder=3.5) # Hour
    ax.plot([clock_x, clock_x + 0.22], [clock_y, clock_y - 0.15], color='#1e1a24', lw=1.5, zorder=3.5) # Minute
    # Center pin
    ax.add_patch(patches.Circle((clock_x, clock_y), 0.04, color='#3d2e2b', zorder=3.6))
    
    # --- TV Stand & TV (Left side) ---
    # Wooden stand
    ax.add_patch(patches.Rectangle((0.6, 2.2), 1.8, 0.75, color='#3d271d', zorder=3))
    # Small decoration on the stand (books)
    ax.add_patch(patches.Rectangle((0.8, 2.95), 0.3, 0.12, color='#b56576', zorder=3.2))
    ax.add_patch(patches.Rectangle((0.85, 3.07), 0.25, 0.1, color='#6b705c', zorder=3.2))
    
    # TV Frame (Facing slightly right)
    ax.add_patch(patches.Rectangle((1.0, 2.95), 0.16, 1.8, color='#181818', zorder=3.8)) # stand/neck
    ax.add_patch(patches.Rectangle((0.95, 2.95), 0.26, 0.05, color='#181818', zorder=3.8)) # base plate
    screen_frame_pts = [(1.1, 3.2), (1.65, 3.4), (1.65, 4.8), (1.1, 5.0)]
    ax.add_patch(patches.Polygon(screen_frame_pts, color='#1f1f1f', zorder=3.9))
    
    # TV Screen Display (Warm nature scenery)
    screen_pts = [(1.15, 3.32), (1.6, 3.5), (1.6, 4.7), (1.15, 4.88)]
    ax.add_patch(patches.Polygon(screen_pts, color='#8ecae6', zorder=4.0)) # Sky
    # Mountain/Green field on screen
    ax.add_patch(patches.Polygon([(1.15, 3.32), (1.6, 3.5), (1.6, 4.0), (1.15, 3.7)], color='#a7c957', zorder=4.1))
    ax.add_patch(patches.Circle((1.38, 4.3), 0.12, color='#f77f00', zorder=4.2)) # Orange sun
    
    # Glowing screen light cone (light blue/cyan glow reflecting on the room)
    tv_glow = patches.Polygon([(1.55, 4.1), (8.5, 1.2), (8.5, 6.2)], 
                              color='#a2d2ff', alpha=0.11, zorder=1.9)
    ax.add_patch(tv_glow)
    
    # --- Armchair (Right side) ---
    chair_color = '#1f3e32'     # Warm deep forest green
    c_back_color = '#1a332a'    # Slightly darker shade for depth
    
    # Chair Backrest
    ax.add_patch(patches.FancyBboxPatch((8.8, 2.8), 1.0, 2.4, 
                                        boxstyle="round,pad=0.2", color=chair_color, zorder=3))
    # Shadow/depth of backrest
    ax.add_patch(patches.FancyBboxPatch((9.0, 2.8), 0.8, 2.4, 
                                        boxstyle="round,pad=0.18", color=c_back_color, zorder=2.9))
    # Chair Seat Cushion
    ax.add_patch(patches.FancyBboxPatch((7.8, 2.6), 1.2, 0.6, 
                                        boxstyle="round,pad=0.12", color=chair_color, zorder=3.5))
    # Far side armrest (slightly visible behind)
    ax.add_patch(patches.FancyBboxPatch((7.7, 2.8), 0.3, 0.8, 
                                        boxstyle="round,pad=0.08", color=c_back_color, zorder=3.1))
    # Near side armrest
    ax.add_patch(patches.FancyBboxPatch((7.6, 2.7), 0.4, 1.0, 
                                        boxstyle="round,pad=0.1", color=chair_color, zorder=5))
    # Armchair wooden legs
    ax.plot([8.0, 7.9], [2.6, 2.1], color='#3e2723', lw=6, zorder=2.5)
    ax.plot([9.5, 9.6], [2.6, 2.1], color='#3e2723', lw=6, zorder=2.5)
    
    # --- Grandmother (Cozy figure) ---
    # Torso/Back
    verts = [
        (8.8, 3.0),
        (9.1, 4.0),
        (8.5, 4.5),
        (8.1, 3.8),
        (8.8, 3.0)
    ]
    codes = [Path.MOVETO, Path.CURVE3, Path.CURVE3, Path.LINETO, Path.CLOSEPOLY]
    path = Path(verts, codes)
    ax.add_patch(patches.PathPatch(path, facecolor='#a3b18a', edgecolor='none', zorder=4.1))
    
    # Red wool cardigan/shawl layer
    cardigan_verts = [
        (8.8, 3.2),
        (9.08, 4.05),
        (8.5, 4.45),
        (8.2, 3.85),
        (8.8, 3.2)
    ]
    card_path = Path(cardigan_verts, codes)
    ax.add_patch(patches.PathPatch(card_path, facecolor='#e07a5f', edgecolor='none', zorder=4.2))
    
    # Sleeve and arm
    sleeve_pts = [(8.5, 4.1), (8.1, 3.85), (7.9, 3.85), (8.3, 4.25)]
    ax.add_patch(patches.Polygon(sleeve_pts, color='#c96850', zorder=5.1))
    
    # Head & Skin
    head_x, head_y = 8.35, 4.72
    ax.add_patch(patches.Circle((head_x, head_y), 0.26, color='#fceade', zorder=5.0))
    
    # Grey Hair & Bun
    ax.add_patch(patches.Circle((head_x + 0.14, head_y + 0.15), 0.26, color='#dcdcdc', zorder=4.8)) # Main hair volume
    ax.add_patch(patches.Circle((head_x + 0.26, head_y + 0.23), 0.11, color='#c0c0c0', zorder=4.9)) # Hair bun
    
    # Glasses (Delicate dark circle)
    ax.add_patch(patches.Circle((head_x - 0.14, head_y + 0.05), 0.08, fill=False, edgecolor='#4a4a4a', lw=1.8, zorder=5.5))
    ax.plot([head_x - 0.06, head_x + 0.1], [head_y + 0.08, head_y + 0.08], color='#4a4a4a', lw=1.2, zorder=5.5) # Glasses ear temple
    
    # Nose & gentle smile
    ax.plot([head_x - 0.23, head_x - 0.26, head_x - 0.22], [head_y + 0.05, head_y + 0.01, head_y - 0.02], color='#e8a598', lw=2, zorder=5.2) # Nose
    ax.plot([head_x - 0.21, head_x - 0.14], [head_y - 0.11, head_y - 0.09], color='#c96850', lw=2.5, solid_capstyle='round', zorder=5.2) # Smile
    
    # Hand holding cup
    ax.add_patch(patches.Circle((7.82, 3.82), 0.06, color='#fceade', zorder=5.5))
    
    # Plaid mustard-yellow blanket over lap
    blanket_pts = [(7.7, 2.7), (8.55, 3.65), (8.15, 3.9), (7.4, 3.12)]
    ax.add_patch(patches.Polygon(blanket_pts, color='#e9c46a', zorder=4.5))
    # Blanket folds & grid stripes
    ax.plot([7.7, 8.15], [3.2, 3.9], color='#f4a261', lw=1.5, zorder=4.6)
    ax.plot([7.5, 8.4], [2.9, 3.75], color='#f4a261', lw=1.5, zorder=4.6)
    # Fringes at the bottom of the blanket
    for px in np.linspace(7.4, 7.7, 6):
        ax.plot([px, px - 0.12], [3.12 - (px-7.4)*0.18, 2.92 - (px-7.4)*0.18], color='#e76f51', lw=2, zorder=4.7)

    # Hot Steaming Tea Mug
    ax.add_patch(patches.Rectangle((7.65, 3.8), 0.24, 0.22, color='#fefae0', zorder=5.6))
    ax.add_patch(patches.Arc((7.65, 3.91), 0.1, 0.12, theta1=90, theta2=270, color='#fefae0', lw=2, zorder=5.6)) # Handle
    # Warm steam swirls
    steam_x = 7.78
    ax.plot([steam_x, steam_x - 0.04, steam_x], [4.1, 4.25, 4.4], color='#ffffff', alpha=0.4, lw=1.8, zorder=6.0)
    ax.plot([steam_x + 0.08, steam_x + 0.04, steam_x + 0.08], [4.1, 4.28, 4.43], color='#ffffff', alpha=0.4, lw=1.8, zorder=6.0)

    # --- Sleepy Orange Cat on the Floor ---
    cat_x, cat_y = 6.9, 2.15
    # Cat Body
    ax.add_patch(patches.Ellipse((cat_x, cat_y + 0.12), width=0.55, height=0.28, color='#f4a261', zorder=4.0))
    # Cat Head
    cat_hx, cat_hy = cat_x - 0.22, cat_y + 0.19
    ax.add_patch(patches.Circle((cat_hx, cat_hy), 0.11, color='#f4a261', zorder=4.1))
    # Ears
    ax.add_patch(patches.Polygon([(cat_hx - 0.08, cat_hy + 0.08), (cat_hx - 0.06, cat_hy + 0.17), (cat_hx, cat_hy + 0.09)], color='#e76f51', zorder=4.2))
    ax.add_patch(patches.Polygon([(cat_hx, cat_hy + 0.09), (cat_hx + 0.06, cat_hy + 0.17), (cat_hx + 0.08, cat_hy + 0.08)], color='#e76f51', zorder=4.2))
    # Curled sleeping eyes (arcs)
    ax.plot([cat_hx - 0.08, cat_hx - 0.04], [cat_hy, cat_hy - 0.02], color='#b76931', lw=1.5, zorder=4.5)
    ax.plot([cat_hx - 0.02, cat_hx + 0.02], [cat_hy, cat_hy - 0.02], color='#b76931', lw=1.5, zorder=4.5)
    # Curled tail
    tail_pts = [(cat_x + 0.18, cat_y + 0.08), (cat_x + 0.32, cat_y + 0.16), (cat_x + 0.28, cat_y + 0.26)]
    ax.plot([p[0] for p in tail_pts], [p[1] for p in tail_pts], color='#f4a261', lw=4, solid_capstyle='round', zorder=4.2)
    
    # --- Coffee Table (Center) ---
    table_x = 4.8
    # Legs standing on floor (standing at y=2.2)
    ax.add_patch(patches.Rectangle((table_x + 0.25, 2.2), 0.08, 0.65, color='#4e342e', zorder=3.2))
    ax.add_patch(patches.Rectangle((table_x + 1.25, 2.2), 0.08, 0.65, color='#4e342e', zorder=3.2))
    # Table top (using facecolor and edgecolor to avoid matplotlib warnings)
    ax.add_patch(patches.Rectangle((table_x, 2.8), 1.6, 0.15, facecolor='#d4a373', edgecolor='#8c6239', lw=1, zorder=3.5))
    
    # Teapot on table
    tp_x = table_x + 0.8
    ax.add_patch(patches.Circle((tp_x, 3.12), 0.15, color='#eae2b7', zorder=4.0)) # Body
    ax.add_patch(patches.Rectangle((tp_x - 0.1, 3.25), 0.2, 0.04, color='#d62828', zorder=4.1)) # Lid
    ax.add_patch(patches.Circle((tp_x, 3.32), 0.03, color='#d62828', zorder=4.2)) # Lid knob
    ax.add_patch(patches.Arc((tp_x + 0.12, 3.12), 0.15, 0.2, theta1=270, theta2=90, color='#eae2b7', lw=2.5, zorder=4.1)) # Handle
    ax.add_patch(patches.Polygon([(tp_x - 0.12, 3.12), (tp_x - 0.24, 3.24), (tp_x - 0.22, 3.26), (tp_x - 0.12, 3.18)], color='#eae2b7', zorder=4.1)) # Spout
    # Teapot steam
    ax.plot([tp_x - 0.22, tp_x - 0.26, tp_x - 0.22], [3.35, 3.48, 3.6], color='#ffffff', alpha=0.3, lw=1.5, zorder=4.5)
    
    # --- Plant Shelf & Hanging Plant (Left Wall above TV) ---
    ax.add_patch(patches.Rectangle((0.5, 6.2), 1.4, 0.1, color='#6d4c41', zorder=3))
    # Shelf brackets
    ax.plot([0.7, 0.7], [6.2, 5.9], color='#4e342e', lw=3, zorder=2.8)
    ax.plot([1.7, 1.7], [6.2, 5.9], color='#4e342e', lw=3, zorder=2.8)
    # Flower pot
    ax.add_patch(patches.Rectangle((1.0, 6.3), 0.35, 0.25, color='#c57b57', zorder=3.5))
    # Draping Ivy Vines
    vines = [
        [(1.18, 6.3), (1.1, 5.8), (1.2, 5.2), (1.15, 4.6), (1.2, 4.2)],
        [(1.28, 6.3), (1.35, 5.6), (1.3, 5.0), (1.38, 4.5)]
    ]
    for pts in vines:
        ax.plot([p[0] for p in pts], [p[1] for p in pts], color='#556b2f', lw=2, zorder=4.0)
        # Leaves
        for i, (lx, ly) in enumerate(pts[1:]):
            side = 0.06 if i % 2 == 0 else -0.06
            ax.add_patch(patches.Circle((lx + side, ly), 0.08, color='#386641', zorder=4.2))
            
    # --- Framed Photo on Right Wall (Above Grandma) ---
    fx, fy, fw, fh = 8.8, 6.2, 1.1, 1.3
    ax.add_patch(patches.Rectangle((fx, fy), fw, fh, color='#4e342e', zorder=3)) # Frame
    ax.add_patch(patches.Rectangle((fx+0.08, fy+0.08), fw-0.16, fh-0.16, color='#fefae0', zorder=3.2)) # Passepartout
    # Simple picture inside: Sweet memory of a house and sun
    ax.add_patch(patches.Polygon([(fx+0.2, fy+0.2), (fx+0.5, fy+0.5), (fx+0.8, fy+0.2)], color='#2a9d8f', zorder=3.5)) # Hills
    ax.add_patch(patches.Circle((fx+0.35, fy+0.8), 0.12, color='#e76f51', zorder=3.6)) # Sun
    
    # --- Cozy Ambient Warmth Particles/Bokeh ---
    bokehs = [(10.2, 5.2, 0.05), (9.8, 4.4, 0.04), (10.4, 3.8, 0.06), (9.5, 4.8, 0.03)]
    for bx, by, br in bokehs:
        ax.add_patch(patches.Circle((bx, by), br, color='#ffe3a0', alpha=0.25, zorder=4.8))
        
    # Save output to given filepath
    plt.savefig(filepath, bbox_inches='tight', pad_inches=0)
    plt.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python script.py <output_image_path>")
        sys.exit(1)
    create_drawing(sys.argv[1])
