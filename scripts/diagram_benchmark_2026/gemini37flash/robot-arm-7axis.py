import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch, Circle, Ellipse, Polygon

def draw_robot_arm(output_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.set_aspect('equal')
    ax.axis('off')

    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#0f172a')

    # Title & Subtitle
    ax.text(600, 860, '7-DOF Articulated Robotic Manipulator', color='#f8fafc',
            fontsize=20, fontweight='bold', ha='center', va='center')
    ax.text(600, 825, 'Kinematic Chain Structure & Joint Axis Definitions (J1 – J7 + Gripper)',
            color='#94a3b8', fontsize=13, ha='center', va='center')

    # Pedestal Shadow & Mount
    ax.add_patch(Ellipse((380, 110), 520, 110, color='#1e293b', ec='#334155', lw=2))
    ax.add_patch(Ellipse((380, 110), 400, 80, color='#0f172a', ec='#475569', lw=1.5))

    # 1. BASE & J1 (Yaw)
    ax.add_patch(Rectangle((260, 130), 240, 50, facecolor='#334155', edgecolor='#475569', lw=2))
    ax.add_patch(Ellipse((380, 180), 240, 60, facecolor='#475569', edgecolor='#64748b', lw=2))
    ax.add_patch(Rectangle((290, 180), 180, 60, facecolor='#94a3b8', edgecolor='#334155', lw=2))
    ax.add_patch(Ellipse((380, 240), 180, 50, facecolor='#cbd5e1', edgecolor='#334155', lw=2))

    # J1 Rotation Arrow
    ax.annotate('', xy=(440, 215), xytext=(320, 215),
                arrowprops=dict(arrowstyle='-|>', color='#facc15', lw=3, mutation_scale=16, connectionstyle='arc3,rad=-0.3'))

    # 2. J2 (Shoulder Pitch)
    ax.add_patch(Polygon([(310, 240), (450, 240), (430, 310), (330, 310)], facecolor='#ea580c', edgecolor='#7c2d12', lw=2))
    ax.add_patch(Ellipse((380, 300), 130, 70, facecolor='#94a3b8', edgecolor='#334155', lw=2))
    ax.add_patch(Circle((380, 300), 14, facecolor='#1e293b'))
    ax.annotate('', xy=(415, 325), xytext=(345, 325),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=3, mutation_scale=16, connectionstyle='arc3,rad=0.5'))

    # 3. LINK 1 & J3 (Arm Roll)
    ax.add_patch(Polygon([(330, 310), (430, 310), (460, 430), (360, 430)], facecolor='#ea580c', edgecolor='#7c2d12', lw=2))
    # J3 Roll Joint
    ax.add_patch(Ellipse((410, 430), 110, 45, angle=-18, facecolor='#cbd5e1', edgecolor='#334155', lw=2))
    ax.annotate('', xy=(445, 435), xytext=(375, 435),
                arrowprops=dict(arrowstyle='-|>', color='#facc15', lw=3, mutation_scale=15, connectionstyle='arc3,rad=-0.4'))

    # Upper part to Elbow
    ax.add_patch(Polygon([(360, 430), (460, 430), (520, 560), (420, 560)], facecolor='#ea580c', edgecolor='#7c2d12', lw=2))

    # 4. J4 (Elbow Pitch)
    ax.add_patch(Circle((470, 565), 45, facecolor='#94a3b8', edgecolor='#334155', lw=2))
    ax.add_patch(Circle((470, 565), 16, facecolor='#1e293b'))
    ax.annotate('', xy=(505, 580), xytext=(435, 580),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=3, mutation_scale=16, connectionstyle='arc3,rad=0.5'))

    # 5. LINK 2 & J5 (Forearm Roll)
    ax.add_patch(Polygon([(490, 550), (520, 590), (680, 640), (650, 600)], facecolor='#ea580c', edgecolor='#7c2d12', lw=2))
    # J5 Joint
    ax.add_patch(Ellipse((665, 620), 40, 80, angle=-15, facecolor='#cbd5e1', edgecolor='#334155', lw=2))
    ax.annotate('', xy=(675, 650), xytext=(675, 590),
                arrowprops=dict(arrowstyle='-|>', color='#facc15', lw=3, mutation_scale=15, connectionstyle='arc3,rad=-0.4'))

    # Forearm to Wrist
    ax.add_patch(Polygon([(680, 630), (760, 650), (770, 690), (690, 670)], facecolor='#ea580c', edgecolor='#7c2d12', lw=2))

    # 6. J6 (Wrist Pitch)
    ax.add_patch(Circle((770, 670), 30, facecolor='#94a3b8', edgecolor='#334155', lw=2))
    ax.add_patch(Circle((770, 670), 10, facecolor='#1e293b'))
    ax.annotate('', xy=(790, 685), xytext=(750, 685),
                arrowprops=dict(arrowstyle='-|>', color='#38bdf8', lw=2.5, mutation_scale=14, connectionstyle='arc3,rad=0.5'))

    # 7. J7 (Flange Roll) & GRIPPER
    ax.add_patch(Rectangle((800, 655), 25, 35, angle=12, facecolor='#cbd5e1', edgecolor='#334155', lw=1.8))
    ax.annotate('', xy=(820, 685), xytext=(820, 655),
                arrowprops=dict(arrowstyle='-|>', color='#facc15', lw=2.5, mutation_scale=14, connectionstyle='arc3,rad=-0.4'))

    # Gripper Body & Fingers
    ax.add_patch(Rectangle((830, 645), 35, 55, facecolor='#334155', edgecolor='#475569', lw=2))
    # Upper Finger
    ax.add_patch(Polygon([(865, 685), (910, 690), (920, 675), (865, 675)], facecolor='#cbd5e1', edgecolor='#334155', lw=1.5))
    ax.add_patch(Rectangle((905, 675), 15, 6, facecolor='#ef4444'))
    # Lower Finger
    ax.add_patch(Polygon([(865, 655), (910, 650), (920, 665), (865, 665)], facecolor='#cbd5e1', edgecolor='#334155', lw=1.5))
    ax.add_patch(Rectangle((905, 660), 15, 6, facecolor='#ef4444'))
    # Target payload sphere
    ax.add_patch(Circle((915, 670), 12, facecolor='#38bdf8', edgecolor='#0284c7', lw=2))

    # LABELS & CALLOUTS
    # J1
    ax.text(140, 210, 'J1: Base Yaw\n±170° (Waist)', color='#facc15', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#facc15', lw=1.2))
    ax.plot([210, 290], [210, 210], color='#facc15', lw=1.2)

    # J2
    ax.text(140, 310, 'J2: Shoulder Pitch\n-120° / +120°', color='#38bdf8', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#38bdf8', lw=1.2))
    ax.plot([220, 310], [310, 310], color='#38bdf8', lw=1.2)

    # J3
    ax.text(160, 440, 'J3: Arm Roll\n±170° (Redundancy)', color='#facc15', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#facc15', lw=1.2))
    ax.plot([240, 350], [440, 440], color='#facc15', lw=1.2)

    # J4
    ax.text(390, 710, 'J4: Elbow Pitch\n-120° / +120°', color='#38bdf8', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#38bdf8', lw=1.2))
    ax.plot([390, 450], [670, 580], color='#38bdf8', lw=1.2)

    # J5
    ax.text(590, 750, 'J5: Forearm Roll\n±170° (Twist)', color='#facc15', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#facc15', lw=1.2))
    ax.plot([590, 650], [710, 640], color='#facc15', lw=1.2)

    # J6
    ax.text(760, 780, 'J6: Wrist Pitch\n-120° / +120°', color='#38bdf8', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#38bdf8', lw=1.2))
    ax.plot([760, 770], [740, 700], color='#38bdf8', lw=1.2)

    # J7
    ax.text(940, 780, 'J7: Flange Roll\n±360° (Continuous)', color='#facc15', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#facc15', lw=1.2))
    ax.plot([900, 830], [740, 680], color='#facc15', lw=1.2)

    # Gripper
    ax.text(1020, 600, 'End Effector\nServo Gripper', color='#4ade80', fontsize=12, fontweight='bold', ha='center',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#1e293b', edgecolor='#22c55e', lw=1.2))
    ax.plot([950, 915], [620, 665], color='#22c55e', lw=1.2)

    # Kinematics Info Card
    info_card = "7-DOF Kinematic Configuration:\n• SRS Architecture (Spherical-Revolute-Spherical)\n• 1 Redundant DOF for obstacle/singularity avoidance\n• Continuous full-pose orientation control"
    ax.text(920, 200, info_card, color='#f8fafc', fontsize=11, ha='center',
            bbox=dict(boxstyle='round,pad=0.6', facecolor='#1e293b', edgecolor='#334155', lw=1.5, alpha=0.95))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(output_path, dpi=100)
    plt.close(fig)

if __name__ == '__main__':
    if len(sys.argv) > 1:
        draw_robot_arm(sys.argv[1])
    else:
        draw_robot_arm('robot-arm-7axis.png')
