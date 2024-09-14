import typescript from "rollup-plugin-typescript2";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
    input: "src/main.ts", // Arquivo de entrada, o código-fonte principal do plugin
    output: {
        dir: "dist/", // Pasta de saída para os arquivos compilados
        format: "cjs", // O formato do módulo que será gerado
        exports: "default",
    },
    external: ["obsidian"], // O Obsidian é uma dependência externa
    plugins: [nodeResolve(), commonjs(), typescript()],
};
