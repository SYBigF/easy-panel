import { useTheme } from "next-themes";
import ReactECharts from "echarts-for-react";
import { EChartsOption } from "echarts"; // 引入 EChartsOption 类型

interface ThemedChartProps {
    option: EChartsOption; // 为 option 明确指定类型
    [key: string]: any; // 其他支持的 props
}
const ThemedChart: React.FC<ThemedChartProps> = ({ option, ...props }) => {
    const { theme } = useTheme(); // 获取当前主题（light, dark, 或 system）

    // 根据主题动态生成 ECharts 配置
    const themedOption = {
        ...option,
        backgroundColor: theme === "dark" ? "#020817" : "#ffffff", // 动态背景色
        textStyle: {
            color: theme === "dark" ? "#ffffff" : "#020817", // 动态文本颜色
        },
        legend: {
            textStyle: {
                color: theme === "dark" ? "#ffffff" : "#020817", // 图例文本颜色
            },
        },
    };

    return <ReactECharts option={themedOption} {...props} />;
};

export default ThemedChart;