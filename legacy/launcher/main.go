package main

import (
	"bufio"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

const address = "127.0.0.1:5500"

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "No se pudo iniciar Reporte Control Total:", err)
		if runtime.GOOS == "windows" {
			fmt.Println("Presiona Enter para cerrar esta ventana.")
			bufio.NewReader(os.Stdin).ReadString('\n')
		}
		os.Exit(1)
	}
}

func run() error {
	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("no se pudo localizar el ejecutable: %w", err)
	}
	executable, err = filepath.EvalSymlinks(executable)
	if err != nil {
		return fmt.Errorf("no se pudo resolver la ubicacion del ejecutable: %w", err)
	}
	root := filepath.Dir(executable)
	index := filepath.Join(root, "index.html")
	info, err := os.Stat(index)
	if err != nil {
		return fmt.Errorf("no se pudo acceder a %s. Coloca el ejecutable junto a index.html y assets/: %w", index, err)
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("%s debe ser un archivo HTML", index)
	}

	listener, err := net.Listen("tcp4", address)
	if err != nil {
		return fmt.Errorf("no se pudo abrir %s. Comprueba si otro reporte o programa utiliza el puerto 5500: %w", address, err)
	}
	defer listener.Close()

	url := "http://" + address
	fmt.Println("Reporte Control Total:", url)
	fmt.Println("Mantén esta ventana abierta mientras utilizas el reporte.")
	fmt.Println("Para detener el servidor, cierra esta ventana o presiona Ctrl+C.")
	if runtime.GOOS == "windows" {
		if err := exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", url).Run(); err != nil {
			fmt.Fprintln(os.Stderr, "No se pudo abrir el navegador automaticamente. Abre", url, "en tu navegador:", err)
		}
	}

	server := &http.Server{Handler: http.FileServer(http.Dir(root))}
	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("el servidor local se detuvo: %w", err)
	}
	return nil
}
