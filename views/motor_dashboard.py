"""
Motor Analytics Dashboard View

Shows usage statistics, success rates, and performance metrics
for all PRIA motors.
"""

import streamlit as st
from pria.motors.registry import MotorRegistry
from pria.config import config


def render():
    """Render the motor dashboard."""

    st.set_page_config(page_title="PRIA Analytics", page_icon="📊", layout="wide")

    # Custom CSS
    st.markdown(
        """
    <style>
    .metric-card {
        background: linear-gradient(135deg, #1E3A2F 0%, #2D5A3F 100%);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #43A047;
    }
    .success-rate {
        color: #43A047;
        font-weight: bold;
    }
    .failure-rate {
        color: #FF5252;
        font-weight: bold;
    }
    </style>
    """,
        unsafe_allow_html=True,
    )

    st.title("📊 PRIA Motor Analytics")
    st.markdown(f"**Version:** {config.app_version} | **Model:** {config.gemini_model}")

    st.markdown("---")

    # Get stats
    stats = MotorRegistry.get_stats()

    # Overview metrics
    st.subheader("📈 Overview")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Total Motors", stats.get("total_motors", 12))

    with col2:
        st.metric("Total Uses", stats.get("total_uses", 0))

    with col3:
        rate = stats.get("success_rate", 0)
        st.metric(
            "Success Rate",
            f"{rate:.1f}%",
            delta_color="normal" if rate > 80 else "inverse",
        )

    with col4:
        avg_dur = stats.get("avg_duration", 0)
        st.metric("Avg Duration", f"{avg_dur:.2f}s")

    st.markdown("---")

    # Individual motor stats
    st.subheader("📋 Motor Details")

    # Create a dataframe-like display
    motors_list = stats.get("motors", [])

    if motors_list:
        # Table header
        st.markdown(
            """
        | Motor | Uses | Success Rate | Avg Duration | Status |
        |-------|-------|--------------|--------------|--------|
        """,
            unsafe_allow_html=True,
        )

        # Build table
        table_data = []
        for m in motors_list:
            success_rate = m.get("success_rate", 0)
            status_emoji = (
                "🟢" if success_rate > 80 else "🟡" if success_rate > 50 else "🔴"
            )

            table_data.append(
                {
                    "Motor": m.get("name", "Unknown"),
                    "Uses": m.get("uses", 0),
                    "Success": f"{success_rate:.1f}%",
                    "Duration": f"{m.get('avg_duration', 0):.2f}s",
                    "Status": status_emoji,
                }
            )

        # Display as table
        st.table(table_data)

    else:
        st.info("No usage data yet. Run some motors to see statistics!")

    st.markdown("---")

    # Motor selection for detailed view
    st.subheader("🔍 Motor Detail View")

    motor_names = [m["name"] for m in motors_list] if motors_list else []

    if motor_names:
        selected_motor = st.selectbox("Select Motor", motor_names)

        if selected_motor:
            motor = MotorRegistry.get(selected_motor)

            if motor:
                col1, col2 = st.columns(2)

                with col1:
                    st.markdown("### Info")
                    st.markdown(f"**Version:** {motor.version}")
                    st.markdown(f"**Status:** {motor.status.value}")
                    st.markdown(f"**Description:** {motor.description}")
                    st.markdown(f"**Tags:** {', '.join(motor.tags)}")

                with col2:
                    st.markdown("### Performance")
                    st.metric("Total Uses", motor.uses)
                    st.metric("Successes", motor.successes)
                    st.metric("Failures", motor.failures)
                    st.metric("Success Rate", f"{motor.success_rate:.1f}%")
                    st.metric("Avg Duration", f"{motor.avg_duration:.2f}s")

    st.markdown("---")

    # Export section
    st.subheader("💾 Export")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Export Stats to JSON"):
            import json

            data = MotorRegistry.export_metadata()
            st.download_button(
                label="Download JSON",
                data=json.dumps(data, indent=2),
                file_name="pria_motor_stats.json",
                mime="application/json",
            )

    with col2:
        if st.button("Reset Statistics"):
            # This would need to be implemented
            st.warning("Reset functionality coming soon!")


if __name__ == "__main__":
    render()
