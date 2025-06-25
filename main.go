package main

import (
	"context"
	"embed"
	_ "embed"
	"log"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/icons"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Crear el servicio de status page
	statusService := NewStatusPageService()

	app := application.New(application.Options{
		Name:        "StatusPage Monitor",
		Description: "Monitor de estado de sitios web",
		Services: []application.Service{
			application.NewService(statusService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ActivationPolicy: application.ActivationPolicyAccessory,
		},
	})

	// Iniciar el servicio de monitoreo
	statusService.Start(context.Background())

	window := app.NewWebviewWindowWithOptions(application.WebviewWindowOptions{
		Title:       "StatusPage Monitor",
		Width:       1100,
		Height:      700,
		Frameless:   false,
		AlwaysOnTop: false,
		Hidden:      false,
		Windows: application.WindowsWindow{
			HiddenOnTaskbar: false,
		},
		BackgroundColour: application.NewRGB(248, 249, 250),
		URL:              "/",
	})

	systemTray := app.NewSystemTray()

	// Support for template icons on macOS
	if runtime.GOOS == "darwin" {
		systemTray.SetTemplateIcon(icons.SystrayMacTemplate)
	} else {
		// Support for light/dark mode icons
		systemTray.SetDarkModeIcon(icons.SystrayDark)
		systemTray.SetIcon(icons.SystrayLight)
	}

	// Support for menu
	myMenu := app.NewMenu()
	myMenu.Add("Mostrar StatusPage").OnClick(func(_ *application.Context) {
		window.Show()
		window.Focus()
	})
	myMenu.AddSeparator()
	myMenu.Add("Salir").OnClick(func(_ *application.Context) {
		app.Quit()
	})
	systemTray.SetMenu(myMenu)

	// systemTray.AttachWindow(window).WindowOffset(5)

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
