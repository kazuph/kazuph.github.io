import sys
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def draw_robot_arm(out_path):
    fig, ax = plt.subplots(figsize=(12, 9), dpi=100)
    fig.patch.set_facecolor("#ffffff")
    ax.set_facecolor("#ffffff")
    ax.set_xlim(0, 1200)
    ax.set_ylim(0, 900)
    ax.axis("off")

    # Title & Subtitle
    ax.text(600, 840, "7-DOF Articulated Robotic Arm Kinematic Chain", ha="center", va="center",
            fontsize=22, fontweight="bold", color="#0f172a")
    ax.text(600, 805, "Anthropomorphic Redundant Manipulator: Joint Axes J1 to J7 & Degrees of Freedom",
            ha="center", va="center", fontsize=12, color="#64748b")

    # Pedestal floor shadow
    ax.add_patch(patches.Ellipse((420, 120), 380, 70, color="#cbd5e1", alpha=0.5, zorder=1))
    ax.add_patch(patches.Ellipse((420, 120), 240, 40, color="#94a3b8", alpha=0.6, zorder=1))

    # 1. BASE FLANGE & PEDESTAL
    ax.add_patch(patches.Ellipse((420, 140), 260, 60, color="#334155", ec="#0f172a", lw=2, zorder=2))
    ax.add_patch(patches.Rectangle((290, 140), 260, 45, color="#334155", ec="#0f172a", lw=2, zorder=2))
    ax.add_patch(patches.Ellipse((420, 185), 260, 60, color="#475569", ec="#0f172a", lw=2, zorder=3))

    # 2. J1 TURNTABLE (Base Yaw, Z-axis rotation)
    ax.add_patch(patches.Rectangle((345, 185), 150, 75, color="#1e293b", ec="#0f172a", lw=2, zorder=4))
    ax.add_patch(patches.Ellipse((420, 260), 150, 40, color="#64748b", ec="#0f172a", lw=2, zorder=5))
    # J1 rotation arrow (yaw around Z)
    t_j1 = np.linspace(np.pi * 0.1, np.pi * 0.9, 30)
    ax.plot(420 + 95 * np.cos(t_j1), 225 - 20 * np.sin(t_j1), color="#ea580c", lw=3.5, zorder=6)
    ax.annotate("", xy=(420 + 95 * np.cos(t_j1[-1]), 225 - 20 * np.sin(t_j1[-1])),
                xytext=(420 + 93 * np.cos(t_j1[-2]), 225 - 20 * np.sin(t_j1[-2])),
                arrowprops=dict(arrowstyle="-|>", color="#ea580c", lw=3.5, mutation_scale=15), zorder=6)

    # 3. LINK 1 & J2 SHOULDER PITCH (at 400, 390)
    # Shoulder body
    ax.add_patch(patches.Polygon([[365, 260], [350, 390], [450, 390], [475, 260]],
                                 color="#f1f5f9", ec="#334155", lw=2, zorder=5))
    # J2 Joint Drum
    ax.add_patch(patches.Circle((400, 390), 42, color="#ea580c", ec="#0f172a", lw=2.5, zorder=6))
    ax.add_patch(patches.Circle((400, 390), 16, color="#1e293b", zorder=7))
    ax.add_patch(patches.Circle((400, 390), 6, color="#f8fafc", zorder=8))
    # J2 pitch rotation arrow
    t_j2 = np.linspace(np.pi * 0.6, np.pi * 1.5, 30)
    ax.plot(400 + 52 * np.cos(t_j2), 390 + 52 * np.sin(t_j2), color="#ea580c", lw=3, zorder=9)
    ax.annotate("", xy=(400 + 52 * np.cos(t_j2[-1]), 390 + 52 * np.sin(t_j2[-1])),
                xytext=(400 + 52 * np.cos(t_j2[-2]), 390 + 52 * np.sin(t_j2[-2])),
                arrowprops=dict(arrowstyle="-|>", color="#ea580c", lw=3, mutation_scale=14), zorder=9)

    # 4. LINK 2 & J3 UPPER ARM ROLL (extending from 400, 390 to 570, 560)
    ax.add_patch(patches.Polygon([[380, 410], [530, 570], [565, 535], [425, 370]],
                                 color="#f8fafc", ec="#334155", lw=2, zorder=5))
    # J3 Roll Joint Swivel (at center 475, 475)
    ax.add_patch(patches.Rectangle((455, 455), 40, 40, angle=-45, color="#1e293b", ec="#0f172a", lw=2, zorder=6))
    # Roll arrow around link
    ax.annotate("", xy=(485, 445), xytext=(455, 485),
                arrowprops=dict(arrowstyle="-|>", connectionstyle="arc3,rad=-0.4", color="#ea580c", lw=3, mutation_scale=14), zorder=8)

    # 5. J4 ELBOW PITCH (at 570, 560)
    ax.add_patch(patches.Circle((570, 560), 38, color="#ea580c", ec="#0f172a", lw=2.5, zorder=6))
    ax.add_patch(patches.Circle((570, 560), 15, color="#1e293b", zorder=7))
    ax.add_patch(patches.Circle((570, 560), 6, color="#f8fafc", zorder=8))
    # J4 pitch arrow
    t_j4 = np.linspace(np.pi * 0.2, np.pi * 1.1, 30)
    ax.plot(570 + 48 * np.cos(t_j4), 560 + 48 * np.sin(t_j4), color="#ea580c", lw=3, zorder=9)
    ax.annotate("", xy=(570 + 48 * np.cos(t_j4[-1]), 560 + 48 * np.sin(t_j4[-1])),
                xytext=(570 + 48 * np.cos(t_j4[-2]), 560 + 48 * np.sin(t_j4[-2])),
                arrowprops=dict(arrowstyle="-|>", color="#ea580c", lw=3, mutation_scale=14), zorder=9)

    # 6. LINK 3 & J5 FOREARM ROLL (extending from 570, 560 down-right to 760, 470)
    ax.add_patch(patches.Polygon([[580, 580], [755, 490], [740, 450], [565, 540]],
                                 color="#f8fafc", ec="#334155", lw=2, zorder=5))
    # J5 Roll Joint Ring (at center 660, 510)
    ax.add_patch(patches.Rectangle((645, 495), 35, 35, angle=25, color="#1e293b", ec="#0f172a", lw=2, zorder=6))
    ax.annotate("", xy=(675, 490), xytext=(645, 525),
                arrowprops=dict(arrowstyle="-|>", connectionstyle="arc3,rad=-0.4", color="#ea580c", lw=3, mutation_scale=14), zorder=8)

    # 7. J6 WRIST PITCH (at 760, 470)
    ax.add_patch(patches.Circle((760, 470), 32, color="#ea580c", ec="#0f172a", lw=2.5, zorder=6))
    ax.add_patch(patches.Circle((760, 470), 12, color="#1e293b", zorder=7))
    ax.add_patch(patches.Circle((760, 470), 5, color="#f8fafc", zorder=8))
    # J6 pitch arrow
    t_j6 = np.linspace(-np.pi * 0.4, np.pi * 0.5, 30)
    ax.plot(760 + 42 * np.cos(t_j6), 470 + 42 * np.sin(t_j6), color="#ea580c", lw=3, zorder=9)
    ax.annotate("", xy=(760 + 42 * np.cos(t_j6[-1]), 470 + 42 * np.sin(t_j6[-1])),
                xytext=(760 + 42 * np.cos(t_j6[-2]), 470 + 42 * np.sin(t_j6[-2])),
                arrowprops=dict(arrowstyle="-|>", color="#ea580c", lw=3, mutation_scale=14), zorder=9)

    # 8. LINK 4 & J7 TOOL FLANGE ROLL (at 810, 445)
    ax.add_patch(patches.Polygon([[775, 485], [835, 455], [820, 420], [760, 450]],
                                 color="#f8fafc", ec="#334155", lw=2, zorder=5))
    ax.add_patch(patches.Rectangle((800, 435), 25, 25, angle=25, color="#1e293b", ec="#0f172a", lw=2, zorder=6))
    ax.annotate("", xy=(820, 425), xytext=(800, 450),
                arrowprops=dict(arrowstyle="-|>", connectionstyle="arc3,rad=-0.4", color="#ea580c", lw=2.8, mutation_scale=13), zorder=8)

    # 9. END EFFECTOR (2-Finger Gripper holding workpiece)
    # Gripper Base
    ax.add_patch(patches.Polygon([[835, 455], [860, 442], [850, 420], [825, 432]],
                                 color="#334155", ec="#0f172a", lw=2, zorder=6))
    # Fingers
    ax.add_patch(patches.Polygon([[855, 455], [885, 440], [890, 430], [860, 445]],
                                 color="#64748b", ec="#0f172a", lw=1.5, zorder=6))
    ax.add_patch(patches.Polygon([[845, 430], [875, 415], [880, 425], [850, 440]],
                                 color="#64748b", ec="#0f172a", lw=1.5, zorder=6))
    # Gripped object
    ax.add_patch(patches.Rectangle((880, 420), 16, 22, color="#fbbf24", ec="#d97706", lw=1.5, zorder=7))

    # CALLOUT LABELS (J1 to J7)
    lbl_box = dict(boxstyle="round,pad=0.3", fc="#ffffff", ec="#0284c7", lw=1.5)

    # J1
    ax.plot([420, 240], [260, 220], color="#0284c7", lw=1.8, zorder=10)
    ax.plot(420, 260, "o", color="#0284c7", ms=5, zorder=10)
    ax.text(230, 220, "J1: Base Yaw (Z-axis)", ha="right", va="center", fontsize=11, fontweight="bold", bbox=lbl_box, zorder=11)

    # J2
    ax.plot([400, 230], [390, 410], color="#0284c7", lw=1.8, zorder=10)
    ax.plot(400, 390, "o", color="#0284c7", ms=5, zorder=10)
    ax.text(220, 410, "J2: Shoulder Pitch", ha="right", va="center", fontsize=11, fontweight="bold", bbox=lbl_box, zorder=11)

    # J3
    ax.plot([475, 280], [475, 560], color="#0284c7", lw=1.8, zorder=10)
    ax.plot(475, 475, "o", color="#0284c7", ms=5, zorder=10)
    ax.text(270, 560, "J3: Upper Arm Roll", ha="right", va="center", fontsize=11, fontweight="bold", bbox=lbl_box, zorder=11)

    # J4
    ax.plot([570, 570], [560, 690], color="#0284c7", lw=1.8, zorder=10)
    ax.plot(570, 560, "o", color="#0284c7", ms=5, zorder=10)
    ax.text(570, 705, "J4: Elbow Pitch", ha="center", va="bottom", fontsize=11, fontweight="bold", bbox=lbl_box, zorder=11)

    # J5
    ax.plot([660, 770], [510, 610], color="#0284c7", lw=1.8, zorder=10)
    ax.plot(660, 510, "o", color="#0284c7", ms=5, zorder=10)
    ax.text(780, 610, "J5: Forearm Roll", ha="left", va="center", fontsize=11, fontweight="bold", bbox=lbl_box, zorder=11)

    # J6
    ax.plot([760, 910], [470, 510], color="#0284c7", lw=1.8, zorder=10)
    ax.plot(760, 470, "o", color="#0284c7", ms=5, zorder=10)
    ax.text(920, 510, "J6: Wrist Pitch", ha="left", va="center", fontsize=11, fontweight="bold", bbox=lbl_box, zorder=11)

    # J7
    ax.plot([810, 940], [445, 420], color="#0284c7", lw=1.8, zorder=10)
    ax.plot(810, 445, "o", color="#0284c7", ms=5, zorder=10)
    ax.text(950, 420, "J7: Tool Flange Roll", ha="left", va="center", fontsize=11, fontweight="bold", bbox=lbl_box, zorder=11)

    # End Effector callout
    ax.plot([890, 950], [430, 330], color="#16a34a", lw=1.8, zorder=10)
    ax.plot(890, 430, "o", color="#16a34a", ms=5, zorder=10)
    ax.text(960, 330, "End Effector (Gripper)", ha="left", va="center", fontsize=11, fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.3", fc="#f0fdf4", ec="#86efac", lw=1.5), zorder=11)

    # Explanatory card at bottom
    ax.text(600, 60, "Kinematic Redundancy: 7 Joints offer 1 Extra Degree of Freedom for Obstacle & Singularity Avoidance",
            ha="center", va="center", fontsize=11, color="#475569",
            bbox=dict(boxstyle="round,pad=0.4", fc="#f8fafc", ec="#cbd5e1", lw=1.2))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(out_path, dpi=100, facecolor=fig.get_facecolor(), bbox_inches="tight", pad_inches=0.1)
    plt.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python robot-arm-7axis.py <output_path>")
        sys.exit(1)
    draw_robot_arm(sys.argv[1])
