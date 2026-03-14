import { config as baseConfig } from "@todo-list/eslint-config/base";
import { config as reactInternalConfig } from "@todo-list/eslint-config/react-internal";
import { nextJsConfig } from "@todo-list/eslint-config/next-js";

export default [...baseConfig, ...reactInternalConfig, ...nextJsConfig];
