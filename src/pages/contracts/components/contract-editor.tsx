import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { Button } from "@/components/ui/button"
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Type
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ContractEditorProps {
    content: string
    onChange: (content: string) => void
    editable?: boolean
}

export function ContractEditor({ content, onChange, editable = true }: ContractEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Placeholder.configure({
                placeholder: 'Escreva o contrato aqui... Use {{nome_aluno}}, {{cpf_aluno}}, etc. para preenchimento automático.',
            }),
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    if (!editor) return null

    return (
        <div className="border rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            {editable && (
                <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-slate-50 dark:bg-slate-800/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={cn("h-8 w-8 p-0 rounded-lg", editor.isActive('bold') && "bg-slate-200 dark:bg-slate-700")}
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={cn("h-8 w-8 p-0 rounded-lg", editor.isActive('italic') && "bg-slate-200 dark:bg-slate-700")}
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={cn("h-8 w-8 p-0 rounded-lg", editor.isActive('underline') && "bg-slate-200 dark:bg-slate-700")}
                    >
                        <UnderlineIcon className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={cn("h-8 w-8 p-0 rounded-lg", editor.isActive('heading', { level: 1 }) && "bg-slate-200 dark:bg-slate-700")}
                    >
                        <Heading1 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={cn("h-8 w-8 p-0 rounded-lg", editor.isActive('heading', { level: 2 }) && "bg-slate-200 dark:bg-slate-700")}
                    >
                        <Heading2 className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        className={cn("h-8 w-8 p-0 rounded-lg", editor.isActive({ textAlign: 'left' }) && "bg-slate-200 dark:bg-slate-700")}
                    >
                        <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        className={cn("h-8 w-8 p-0 rounded-lg", editor.isActive({ textAlign: 'center' }) && "bg-slate-200 dark:bg-slate-700")}
                    >
                        <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        className={cn("h-8 w-8 p-0 rounded-lg", editor.isActive({ textAlign: 'right' }) && "bg-slate-200 dark:bg-slate-700")}
                    >
                        <AlignRight className="h-4 w-4" />
                    </Button>

                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={cn("h-8 w-8 p-0 rounded-lg", editor.isActive('bulletList') && "bg-slate-200 dark:bg-slate-700")}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={cn("h-8 w-8 p-0 rounded-lg", editor.isActive('orderedList') && "bg-slate-200 dark:bg-slate-700")}
                    >
                        <ListOrdered className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto h-8 px-2 text-[10px] font-bold uppercase tracking-widest gap-2 border-slate-200 dark:border-slate-800"
                        onClick={() => editor.commands.insertContent('{{nome_aluno}}')}
                    >
                        <Type className="w-3 h-3" />
                        Inserir Nome
                    </Button>
                </div>
            )}
            <EditorContent
                editor={editor}
                className={cn(
                    "prose prose-slate dark:prose-invert max-w-none p-6 min-h-[400px] focus:outline-none",
                    editable && "cursor-text"
                )}
            />
        </div>
    )
}
