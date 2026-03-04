import { useState, useRef, useEffect } from "react"
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Crop as CropIcon } from "lucide-react"

interface ImageCropperProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    imageFile: File | null
    aspectRatio?: number
    onCropComplete: (croppedBlob: Blob) => Promise<void>
}

// Helper to center the crop by default
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: "%",
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    )
}

export function ImageCropper({ open, onOpenChange, imageFile, aspectRatio, onCropComplete }: ImageCropperProps) {
    const [imgSrc, setImgSrc] = useState("")
    const [crop, setCrop] = useState<Crop>()
    const [isCropping, setIsCropping] = useState(false)
    const imgRef = useRef<HTMLImageElement>(null)

    // Load file when changed
    useEffect(() => {
        if (!imageFile) {
            setImgSrc("")
            return
        }
        const reader = new FileReader()
        reader.addEventListener("load", () => setImgSrc(reader.result?.toString() || ""))
        reader.readAsDataURL(imageFile)
    }, [imageFile])

    function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        if (aspectRatio) {
            const { width, height } = e.currentTarget
            setCrop(centerAspectCrop(width, height, aspectRatio))
        }
    }

    async function handleSave() {
        if (!imgRef.current || !crop || !crop.width || !crop.height) {
            // Se não houver corte (ex: imagem muito pequena, usuário não mexeu), pegar a imagem toda
            if (imgRef.current && imageFile) {
                setIsCropping(true)
                try {
                    await onCropComplete(imageFile)
                    onOpenChange(false)
                } finally {
                    setIsCropping(false)
                }
            }
            return
        }

        setIsCropping(true)

        try {
            const canvas = document.createElement("canvas")
            const scaleX = imgRef.current.naturalWidth / imgRef.current.width
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height

            canvas.width = crop.width * scaleX
            canvas.height = crop.height * scaleY

            const ctx = canvas.getContext("2d")
            if (!ctx) throw new Error("No 2d context")

            ctx.drawImage(
                imgRef.current,
                crop.x * scaleX,
                crop.y * scaleY,
                crop.width * scaleX,
                crop.height * scaleY,
                0,
                0,
                crop.width * scaleX,
                crop.height * scaleY
            )

            // Convert canvas to blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) reject(new Error("Canvas is empty"))
                        else resolve(blob)
                    },
                    "image/png",
                    1 // Quality
                )
            })

            await onCropComplete(blob)
            onOpenChange(false)
        } catch (error) {
            console.error("Error cropping image:", error)
        } finally {
            setIsCropping(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!isCropping) onOpenChange(val)
        }}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Recortar Imagem</DialogTitle>
                    <DialogDescription>
                        Arraste as bordas para ajustar o recorte da imagem antes de salvar.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-center bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden my-4 max-h-[60vh]">
                    {imgSrc ? (
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            aspect={aspectRatio}
                            className="max-h-full"
                        >
                            <img
                                ref={imgRef}
                                src={imgSrc}
                                alt="Para recortar"
                                onLoad={onImageLoad}
                                className="max-h-[60vh] object-contain"
                            />
                        </ReactCrop>
                    ) : (
                        <div className="flex h-40 w-full items-center justify-center text-slate-400">
                            Carregando imagem...
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCropping}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isCropping || !imgSrc}>
                        {isCropping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CropIcon className="mr-2 h-4 w-4" />
                        Confirmar Corte
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
