import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.transforms as mtransforms

def draw_robot_arm_7axis(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(-5.5, 5.5)
    ax.set_ylim(-4.5, 4.5)
    ax.set_aspect('equal')
    ax.axis('off')

    c_base = '#2B6CB0'
    c_joint = '#ED8936'
    c_link = '#CBD5E0'
    c_darklink = '#718096'
    c_gripper = '#E53E3E'
    c_bg = '#F7FAFC'

    fig.patch.set_facecolor(c_bg)

    # Base Platform (J1)
    ax.add_patch(patches.Polygon([(-1.8, -3.2), (1.8, -3.2), (1.4, -2.6), (-1.4, -2.6)], facecolor=c_base, edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Rectangle((-1.4, -2.6), 2.8, 0.8, facecolor='#3182CE', edgecolor='black', linewidth=1.5))
    ax.text(0, -2.2, 'BASE', fontsize=12, fontweight='bold', color='white', ha='center', va='center')

    # Joint 1 (J1: Base Yaw)
    ax.add_patch(patches.Rectangle((-0.8, -1.8), 1.6, 0.6, facecolor=c_joint, edgecolor='black', linewidth=1.5))
    ax.annotate('', xy=(1.1, -1.5), xytext=(-1.1, -1.5), arrowprops=dict(arrowstyle='->', lw=2, color='#C05621'))
    ax.text(1.3, -1.5, 'J1 (Base Yaw)', fontsize=12, fontweight='bold', color='#C05621', va='center')

    # Link 1
    ax.add_patch(patches.Rectangle((-0.5, -1.2), 1.0, 0.8, facecolor=c_link, edgecolor=c_darklink, linewidth=1.5))

    # Joint 2 (J2: Shoulder Pitch)
    ax.add_patch(patches.Circle((-0.9, -0.4), 0.55, facecolor=c_joint, edgecolor='black', linewidth=1.5))
    ax.annotate('', xy=(-0.9, 0.3), xytext=(-0.9, -1.1), arrowprops=dict(arrowstyle='->', lw=2, color='#C05621'))
    ax.text(-1.6, -0.4, 'J2 (Shoulder Pitch)', fontsize=12, fontweight='bold', color='#C05621', ha='right', va='center')

    # Link 2 (Upper Arm)
    link2 = patches.Rectangle((-0.9, -0.4), 2.6, 0.6, facecolor=c_link, edgecolor=c_darklink, linewidth=1.5)
    t2 = mtransforms.Affine2D().rotate_deg_around(-0.9, -0.4, 35) + ax.transData
    link2.set_transform(t2)
    ax.add_patch(link2)

    # Joint 3 (J3: Shoulder Roll)
    j3_x, j3_y = 1.2, 1.1
    ax.add_patch(patches.Circle((j3_x, j3_y), 0.48, facecolor=c_joint, edgecolor='black', linewidth=1.5))
    ax.annotate('', xy=(j3_x + 0.6, j3_y), xytext=(j3_x - 0.6, j3_y), arrowprops=dict(arrowstyle='->', lw=2, color='#C05621'))
    ax.text(j3_x - 0.5, j3_y + 0.6, 'J3 (Shoulder Roll)', fontsize=12, fontweight='bold', color='#C05621', ha='right')

    # Link 3 (Elbow Link)
    link3 = patches.Rectangle((j3_x, j3_y - 0.3), 2.0, 0.6, facecolor=c_link, edgecolor=c_darklink, linewidth=1.5)
    t3 = mtransforms.Affine2D().rotate_deg_around(j3_x, j3_y, -25) + ax.transData
    link3.set_transform(t3)
    ax.add_patch(link3)

    # Joint 4 (J4: Elbow Pitch)
    j4_x, j4_y = 3.0, 0.3
    ax.add_patch(patches.Circle((j4_x, j4_y), 0.45, facecolor=c_joint, edgecolor='black', linewidth=1.5))
    ax.annotate('', xy=(j4_x, j4_y + 0.6), xytext=(j4_x, j4_y - 0.6), arrowprops=dict(arrowstyle='->', lw=2, color='#C05621'))
    ax.text(j4_x + 0.6, j4_y - 0.6, 'J4 (Elbow Pitch)', fontsize=12, fontweight='bold', color='#C05621', va='top')

    # Link 4 (Forearm)
    link4 = patches.Rectangle((j4_x, j4_y - 0.25), 1.6, 0.5, facecolor=c_link, edgecolor=c_darklink, linewidth=1.5)
    t4 = mtransforms.Affine2D().rotate_deg_around(j4_x, j4_y, 40) + ax.transData
    link4.set_transform(t4)
    ax.add_patch(link4)

    # Joint 5 (J5: Wrist Roll)
    j5_x, j5_y = 4.2, 1.3
    ax.add_patch(patches.Circle((j5_x, j5_y), 0.38, facecolor=c_joint, edgecolor='black', linewidth=1.5))
    ax.text(j5_x - 0.5, j5_y + 0.5, 'J5 (Wrist Roll)', fontsize=11, fontweight='bold', color='#C05621', ha='right')

    # Joint 6 (J6: Wrist Pitch)
    j6_x, j6_y = 4.8, 1.1
    ax.add_patch(patches.Circle((j6_x, j6_y), 0.35, facecolor=c_joint, edgecolor='black', linewidth=1.5))
    ax.text(j6_x, j6_y + 0.5, 'J6 (Wrist Pitch)', fontsize=11, fontweight='bold', color='#C05621', ha='center')

    # Joint 7 (J7: Wrist Twist)
    j7_x, j7_y = 5.4, 1.1
    ax.add_patch(patches.Rectangle((j7_x - 0.15, j7_y - 0.3), 0.3, 0.6, facecolor='#C05621', edgecolor='black', linewidth=1.5))
    ax.text(j7_x, j7_y - 0.6, 'J7 (Twist)', fontsize=11, fontweight='bold', color='#C05621', ha='center', va='top')

    # End Effector Gripper
    ax.add_patch(patches.Rectangle((5.6, 0.8), 0.4, 0.6, facecolor=c_gripper, edgecolor='black', linewidth=1.5))
    ax.add_patch(patches.Rectangle((6.0, 1.2), 0.6, 0.15, facecolor=c_gripper, edgecolor='black', linewidth=1))
    ax.add_patch(patches.Rectangle((6.0, 0.8), 0.6, 0.15, facecolor=c_gripper, edgecolor='black', linewidth=1))
    ax.text(6.65, 1.1, 'End Effector', fontsize=12, fontweight='bold', color=c_gripper, va='center')

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches='tight', pad_inches=0.1)
    plt.close()

if __name__ == '__main__':
    output_file = sys.argv[1] if len(sys.argv) > 1 else 'robot-arm-7axis.png'
    draw_robot_arm_7axis(output_file)
