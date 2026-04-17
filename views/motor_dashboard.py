"""
Motor Analytics Dashboard View

Shows usage statistics, success rates, and performance metrics
for all PRIA motors.
"""

import streamlit as st
from ui.cache import get_motor_stats
from ui.helpers import GEMINI_MODEL

APP_VERSION = "5.6"


def render(ss):
    """Render the motor dashboard.

    Args:
        ss: Streamlit session_state object
    """
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
    st.markdown(f"**Version:** {APP_VERSION} | **Model:** {GEMINI_MODEL}")

    st.markdown("---")

    # Get stats
    stats = get_motor_stats()

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
            # Find the motor data from stats
            motor_data = None
            for m in motors_list:
                if m.get("name") == selected_motor:
                    motor_data = m
                    break

            if motor_data:
                col1, col2 = st.columns(2)

                with col1:
                    st.markdown("### Info")
                    st.markdown(f"**Version:** {motor_data.get('version', 'N/A')}")
                    st.markdown(f"**Status:** {motor_data.get('status', 'active')}")
                    st.markdown(
                        f"**Description:** {motor_data.get('description', 'N/A')}"
                    )
                    st.markdown(f"**Tags:** {', '.join(motor_data.get('tags', []))}")

                with col2:
                    st.markdown("### Performance")
                    st.metric("Total Uses", motor_data.get("uses", 0))
                    st.metric("Successes", motor_data.get("successes", 0))
                    st.metric("Failures", motor_data.get("failures", 0))
                    st.metric(
                        "Success Rate", f"{motor_data.get('success_rate', 0):.1f}%"
                    )
                    st.metric(
                        "Avg Duration", f"{motor_data.get('avg_duration', 0):.2f}s"
                    )

    st.markdown("---")

    # Export section
    st.subheader("💾 Export")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Export Stats to JSON"):
            import json

            data = get_motor_stats()
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
    # For testing without Streamlit
    class MockSS:
        pass

    render(MockSS())
