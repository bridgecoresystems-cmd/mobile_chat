import { createApp } from "vue"
import { router }    from "./router"
import { initAuth }  from "./stores/auth"
import App           from "./App.vue"
import "./style.css"

// Load persisted auth from native storage before router runs
initAuth().then(() => {
  createApp(App).use(router).mount("#app")
})
